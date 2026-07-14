import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let memoryCache: Record<string, string> = {}
let hydrated = false
let supabaseInstance: SupabaseClient | null = null

const chromeStorageAdapter = {
  getItem: async (key: string) => {
    if (Object.prototype.hasOwnProperty.call(memoryCache, key)) {
      return memoryCache[key] ?? null
    }
    const stored = await chrome.storage.local.get(key)
    const value = stored[key]
    if (typeof value === 'string') {
      memoryCache[key] = value
      return value
    }
    return null
  },
  setItem: async (key: string, value: string) => {
    memoryCache[key] = value
    await chrome.storage.local.set({ [key]: value })
  },
  removeItem: async (key: string) => {
    delete memoryCache[key]
    await chrome.storage.local.remove(key)
  },
}

export async function hydrateSessionCache(): Promise<void> {
  if (hydrated) return
  const stored = await chrome.storage.local.get(null)
  memoryCache = {}
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === 'string') {
      memoryCache[key] = value
    }
  }
  hydrated = true
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing Supabase environment variables in extension build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repo root .env.',
      )
    }
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  }
  return supabaseInstance
}
