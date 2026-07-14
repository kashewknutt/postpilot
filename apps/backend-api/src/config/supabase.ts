import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Environment } from './environment.js'

let serviceClient: SupabaseClient | null = null
let anonClient: SupabaseClient | null = null

export function getServiceSupabase(env: Environment): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return serviceClient
}

export function getAnonSupabase(env: Environment): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return anonClient
}
