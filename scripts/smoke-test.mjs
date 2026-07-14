#!/usr/bin/env node
/**
 * End-to-end smoke test against local API + remote Supabase.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(
  join(dirname(fileURLToPath(import.meta.url)), '../packages/db/package.json'),
)
const postgres = require('postgres')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) throw new Error('Missing .env')
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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function supabase(path, { method = 'GET', body, key } = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  const res = await fetch(`${process.env.SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { res, json, text }
}

async function main() {
  loadEnv()
  const baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY
  assert(process.env.SUPABASE_URL && serviceKey && anonKey, 'Missing Supabase env vars')
  assert(process.env.DATABASE_URL, 'Missing DATABASE_URL')

  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })

  try {
    console.log('[smoke] 1) health check')
    const health = await fetch(`${baseUrl}/health`)
    assert(health.ok, `Health failed: ${health.status}`)
    console.log('  ✓', await health.json())

    console.log('[smoke] 2) unauthenticated AI request → 401')
    const unauth = await fetch(`${baseUrl}/api/v1/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'linkedin',
        action: 'rewrite',
        content: 'hello world',
      }),
    })
    assert(unauth.status === 401, `Expected 401, got ${unauth.status}`)
    console.log('  ✓ 401 unauthorized')

    const email = `smoke+${Date.now()}@postpilot.test`
    const password = 'SmokeTest123!'
    console.log('[smoke] 3) create test user')
    const created = await supabase('/auth/v1/admin/users', {
      method: 'POST',
      key: serviceKey,
      body: { email, password, email_confirm: true },
    })
    assert(created.res.ok, `createUser failed: ${created.text}`)
    const userId = created.json.id
    console.log('  ✓ user', userId)

    await new Promise((r) => setTimeout(r, 800))
    const profiles = await sql`SELECT id FROM public.profiles WHERE id = ${userId}`
    console.log(profiles.length ? '  ✓ profile auto-created by trigger' : '  • profile missing')

    console.log('[smoke] 4) sign in + free tier AI (no subscription)')
    const signedIn = await supabase('/auth/v1/token?grant_type=password', {
      method: 'POST',
      key: anonKey,
      body: { email, password },
    })
    assert(signedIn.res.ok, `signIn failed: ${signedIn.text}`)
    const token = signedIn.json.access_token

    const usageRes = await fetch(`${baseUrl}/api/v1/billing/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert(usageRes.ok, `usage endpoint failed: ${usageRes.status}`)
    const usage = await usageRes.json()
    assert(usage.freeAllowance === 5, `Expected freeAllowance 5, got ${usage.freeAllowance}`)
    assert(usage.remainingFree === 5, `Expected remainingFree 5, got ${usage.remainingFree}`)
    console.log('  ✓ usage:', usage)

    const freeAi = await fetch(`${baseUrl}/api/v1/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        platform: 'linkedin',
        action: 'rewrite',
        content: 'hello world from postpilot smoke test',
      }),
    })
    const freeBody = await freeAi.text()
    assert(freeAi.ok, `Free AI failed: ${freeAi.status} ${freeBody}`)
    assert(freeBody.includes('event: done'), 'Free AI missing done event')
    console.log('  ✓ free generation allowed')

    console.log('[smoke] 5) exhaust free quota → 402')
    for (let i = 0; i < 4; i += 1) {
      const res = await fetch(`${baseUrl}/api/v1/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          platform: 'linkedin',
          action: 'shorten',
          content: `free generation ${i + 2}`,
        }),
      })
      const body = await res.text()
      assert(res.ok, `Free gen ${i + 2} failed: ${res.status} ${body}`)
    }

    const blocked = await fetch(`${baseUrl}/api/v1/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        platform: 'linkedin',
        action: 'rewrite',
        content: 'should be blocked',
      }),
    })
    assert(blocked.status === 402, `Expected 402 after free limit, got ${blocked.status}: ${await blocked.text()}`)
    console.log('  ✓ 402 after 5 free generations')

    console.log('[smoke] 6) seed subscription + unlimited AI')
    const customerId = `cus_smoke_${Date.now()}`
    const subId = `sub_smoke_${Date.now()}`
    const now = new Date()
    const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO stripe.customers (id, user_id, email)
      VALUES (${customerId}, ${userId}, ${email})
    `
    await sql`
      INSERT INTO stripe.subscriptions (
        id, customer_id, status, price_id, quantity, cancel_at_period_end,
        current_period_start, current_period_end
      ) VALUES (
        ${subId}, ${customerId}, 'active', 'price_smoke_test', 1, false, ${now}, ${later}
      )
    `
    console.log('  ✓ subscription seeded')

    const aiRes = await fetch(`${baseUrl}/api/v1/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        platform: 'linkedin',
        action: 'professional',
        content: 'hey check out this project',
      }),
    })
    const aiBody = await aiRes.text()
    assert(aiRes.ok, `AI generate failed: ${aiRes.status} ${aiBody}`)
    if (!aiBody.includes('event: message') && !aiBody.includes('event: done')) {
      throw new Error(`SSE stream missing events. Body was: ${JSON.stringify(aiBody.slice(0, 500))}`)
    }
    if (aiBody.includes('event: error') && !aiBody.includes('event: message')) {
      throw new Error(`AI stream returned only error: ${aiBody}`)
    }
    console.log('  ✓ subscribed AI SSE stream received')

    const logs = await sql`SELECT id FROM public.ai_logs WHERE user_id = ${userId}`
    console.log('  ✓ ai_logs rows:', logs.length)

    console.log('[smoke] 7) cleanup test user')
    await sql`DELETE FROM stripe.subscriptions WHERE id = ${subId}`
    await sql`DELETE FROM stripe.customers WHERE id = ${customerId}`
    await sql`DELETE FROM public.ai_logs WHERE user_id = ${userId}`
    await supabase(`/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      key: serviceKey,
    })
    console.log('  ✓ cleaned up')

    console.log('\n[smoke] ALL CHECKS PASSED')
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error('[smoke] FAILED:', error.message)
  process.exit(1)
})
