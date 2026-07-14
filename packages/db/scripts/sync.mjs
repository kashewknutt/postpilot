#!/usr/bin/env node
/**
 * Sync TypeScript schema → remote Supabase Postgres.
 *
 * Source of truth: packages/db/src/schema.ts
 * Run from repo root: `pnpm db:sync`
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PKG = join(__dirname, '..')
const ROOT = join(DB_PKG, '../..')
const SCHEMA_FILE = join(DB_PKG, 'src/schema.ts')
const POLICIES_FILE = join(DB_PKG, 'src/policies.sql')

function log(message) {
  console.log(`[db-sync] ${message}`)
}

function fail(message, code = 1) {
  console.error(`[db-sync] ERROR: ${message}`)
  process.exit(code)
}

function loadRootEnv() {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) fail('Missing root .env file')
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function run(cmd, args) {
  log(`Running: ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd: DB_PKG,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })
  if (result.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(' ')}`, result.status ?? 1)
  }
}

async function applyPolicies(databaseUrl) {
  if (!existsSync(POLICIES_FILE)) {
    log('No policies.sql found — skipping auth FKs / RLS / triggers')
    return
  }
  log('Applying policies.sql (FKs, RLS, triggers)...')
  const sql = postgres(databaseUrl, { max: 1, prepare: false })
  try {
    const content = readFileSync(POLICIES_FILE, 'utf8')
    await sql.unsafe(content)
    log('policies.sql applied successfully')
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function verify(databaseUrl) {
  log('Verifying remote tables...')
  const sql = postgres(databaseUrl, { max: 1, prepare: false })
  try {
    const tables = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('public', 'stripe')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `
    if (tables.length === 0) fail('No tables found after sync')
    for (const row of tables) {
      log(`  ✓ ${row.table_schema}.${row.table_name}`)
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function main() {
  loadRootEnv()

  if (!existsSync(SCHEMA_FILE)) fail(`Missing schema file: ${SCHEMA_FILE}`)
  if (!process.env.DATABASE_URL) {
    fail(
      [
        'DATABASE_URL is missing from .env',
        '',
        'Add it from Supabase Dashboard:',
        '  Project Settings → Database → Connection string → URI',
        '',
        'Example:',
        '  DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres',
      ].join('\n'),
    )
  }

  log('Source of truth: packages/db/src/schema.ts')
  log('Pushing schema to remote database (drizzle-kit push)...')
  run('pnpm', ['exec', 'drizzle-kit', 'push', '--force', '--config', 'drizzle.config.ts'])

  await applyPolicies(process.env.DATABASE_URL)
  await verify(process.env.DATABASE_URL)
  log('Database sync complete.')
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
