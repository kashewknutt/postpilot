import { Type, Static } from '@sinclair/typebox'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export const EnvironmentSchema = Type.Object({
  API_PORT: Type.Number({ default: 8080 }),
  API_HOST: Type.String({ default: '0.0.0.0' }),
  CORS_ORIGIN: Type.String({ default: '*' }),
  SUPABASE_URL: Type.String(),
  SUPABASE_ANON_KEY: Type.String(),
  SUPABASE_SERVICE_ROLE_KEY: Type.String(),
  DATABASE_URL: Type.String({ default: '' }),
  STRIPE_SECRET_KEY: Type.String({ default: '' }),
  STRIPE_WEBHOOK_SECRET: Type.String({ default: '' }),
  STRIPE_PRICE_ID: Type.String({ default: '' }),
  GEMINI_API_KEY: Type.String({ default: '' }),
  NODE_ENV: Type.String({ default: 'development' }),
})

export type Environment = Static<typeof EnvironmentSchema>

const REQUIRED_RUNTIME_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
] as const

export function loadEnvironment(): Environment {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const rootEnv = join(process.cwd(), '.env')
      const parentEnv = join(process.cwd(), '../../.env')
      if (existsSync(rootEnv)) {
        process.loadEnvFile(rootEnv)
      } else if (existsSync(parentEnv)) {
        process.loadEnvFile(parentEnv)
      }
    } catch {
      // Ignored
    }
  }

  // Cloud Run injects PORT; fall back to API_PORT for local/dev.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 8080)

  return {
    API_PORT: Number.isFinite(port) ? port : 8080,
    API_HOST: process.env.API_HOST ?? '0.0.0.0',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID ?? '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  }
}

export function getMissingRuntimeSecrets(env: Environment): string[] {
  return REQUIRED_RUNTIME_KEYS.filter((key) => !env[key])
}

export function assertRuntimeConfigured(env: Environment): void {
  const missing = getMissingRuntimeSecrets(env)
  if (missing.length > 0) {
    throw new Error(
      `Missing required Cloud Run secrets/env vars: ${missing.join(', ')}. ` +
        'Attach them in Cloud Run → Edit & deploy new revision → Variables & secrets.',
    )
  }
}
