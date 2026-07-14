import { Type, Static } from '@sinclair/typebox'

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

export function loadEnvironment(): Environment {
  const env = {
    API_PORT: Number(process.env.API_PORT ?? 8080),
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

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables.')
  }
  if (!env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL for server-side Postgres access.')
  }

  return env
}
