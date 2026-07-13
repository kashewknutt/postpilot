import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let cachedSession: Record<string, string> | null = null
let supabaseInstance: SupabaseClient | null = null

const customStorageAdapter = {
  getItem: (key: string) => {
    if (cachedSession) return cachedSession[key] ?? null
    return null
  },
  setItem: (key: string, value: string) => {
    cachedSession = cachedSession || {}
    cachedSession[key] = value
    void chrome.storage.local.set({ [key]: value })
  },
  removeItem: (key: string) => {
    if (cachedSession) delete cachedSession[key]
    void chrome.storage.local.remove(key)
  },
}

export async function hydrateSessionCache(): Promise<void> {
  const stored = await chrome.storage.local.get(null)
  cachedSession = Object.fromEntries(
    Object.entries(stored).map(([key, value]) => [key, String(value)]),
  )
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables in extension build.')
    }
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: customStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  }
  return supabaseInstance
}
