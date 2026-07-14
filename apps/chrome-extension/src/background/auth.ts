import type { AuthSession, AuthState } from '@postpilot/shared-types'
import { getSupabaseClient, hydrateSessionCache } from './supabaseClient.js'

const AUTH_STORAGE_KEY = 'postpilot-auth-session'

let memorySession: AuthSession | null = null

export async function initializeAuth(): Promise<AuthState> {
  await hydrateSessionCache()
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEY)
  memorySession = (stored[AUTH_STORAGE_KEY] as AuthSession | undefined) ?? null
  return getAuthState()
}

export function getAuthState(): AuthState {
  return {
    isAuthenticated: Boolean(memorySession?.accessToken),
    session: memorySession,
  }
}

export async function signInWithGoogle(): Promise<AuthState> {
  const supabase = getSupabaseClient()

  const redirectUrl = chrome.identity.getRedirectURL('oauth2')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })

  if (error || !data.url) {
    throw new Error(error?.message ?? 'Failed to start OAuth flow.')
  }

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: data.url, interactive: true },
      (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          reject(new Error(chrome.runtime.lastError?.message ?? 'OAuth flow was cancelled.'))
          return
        }
        resolve(callbackUrl)
      },
    )
  })

  const authCode = new URL(responseUrl).searchParams.get('code')
  if (!authCode) {
    throw new Error('Authorization code missing from OAuth callback.')
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(authCode)

  if (exchangeError || !sessionData.session || !sessionData.user) {
    throw new Error(exchangeError?.message ?? 'Failed to exchange OAuth code.')
  }

  memorySession = {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
    expiresAt: sessionData.session.expires_at ?? 0,
    userId: sessionData.user.id,
    email: sessionData.user.email ?? '',
  }

  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: memorySession })
  return getAuthState()
}

export async function signOut(): Promise<AuthState> {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
  memorySession = null
  await chrome.storage.local.remove(AUTH_STORAGE_KEY)
  return getAuthState()
}

export function getAccessToken(): string | null {
  return memorySession?.accessToken ?? null
}
