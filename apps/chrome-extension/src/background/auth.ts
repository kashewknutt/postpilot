import type { AuthSession, AuthState } from '@postpilot/shared-types'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient, hydrateSessionCache } from './supabaseClient.js'

const AUTH_STORAGE_KEY = 'postpilot-auth-session'

let memorySession: AuthSession | null = null
let authListenerBound = false

function mapSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    userId: session.user.id,
    email: session.user.email ?? '',
  }
}

async function persistSession(session: AuthSession | null): Promise<void> {
  memorySession = session
  if (session) {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: session })
  } else {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY)
  }
}

async function syncFromSupabase(): Promise<AuthState> {
  await hydrateSessionCache()
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.warn('[postpilot] getSession failed', error.message)
  }

  if (data.session) {
    await persistSession(mapSession(data.session))
  } else {
    const stored = await chrome.storage.local.get(AUTH_STORAGE_KEY)
    memorySession = (stored[AUTH_STORAGE_KEY] as AuthSession | undefined) ?? null
  }

  return getAuthState()
}

function bindAuthListener(): void {
  if (authListenerBound) return
  authListenerBound = true
  const supabase = getSupabaseClient()
  supabase.auth.onAuthStateChange((_event, session) => {
    void persistSession(session ? mapSession(session) : null)
  })
}

export async function initializeAuth(): Promise<AuthState> {
  await hydrateSessionCache()
  bindAuthListener()
  return syncFromSupabase()
}

export function getAuthState(): AuthState {
  return {
    isAuthenticated: Boolean(memorySession?.accessToken),
    session: memorySession,
  }
}

export function getOAuthRedirectUrl(): string {
  return chrome.identity.getRedirectURL()
}

export function getExtensionId(): string {
  return chrome.runtime.id
}

async function createOidcNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return { raw, hashed }
}

function extractIdToken(redirectedTo: string): string | null {
  try {
    const url = new URL(redirectedTo)
    const fromHash = new URLSearchParams(url.hash.replace(/^#/, '')).get('id_token')
    if (fromHash) return fromHash
    const fromQuery = url.searchParams.get('id_token')
    if (fromQuery) return fromQuery
  } catch {
    // fall through to regex
  }

  const match = redirectedTo.match(/[#&?]id_token=([^&]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function extractOAuthError(redirectedTo: string): string | null {
  try {
    const url = new URL(redirectedTo)
    const params = new URLSearchParams(url.hash.replace(/^#/, ''))
    const hashError = params.get('error') || params.get('error_description')
    if (hashError) return hashError
    return url.searchParams.get('error_description') || url.searchParams.get('error')
  } catch {
    return null
  }
}

/**
 * Native Google sign-in for Chrome extensions (Supabase recommended path):
 * launchWebAuthFlow → Google id_token → supabase.auth.signInWithIdToken
 */
export async function signInWithGoogle(): Promise<AuthState> {
  await hydrateSessionCache()
  bindAuthListener()

  const supabase = getSupabaseClient()
  const manifest = chrome.runtime.getManifest()
  const clientId = manifest.oauth2?.client_id

  if (!clientId || clientId.includes('YOUR_')) {
    throw new Error(
      'Missing Google OAuth client ID. Set VITE_GOOGLE_OAUTH_CLIENT_ID in the root .env to a Chrome Extension OAuth client ID from Google Cloud Console.',
    )
  }

  const scopes = manifest.oauth2?.scopes?.length
    ? manifest.oauth2.scopes
    : ['openid', 'email', 'profile']

  const redirectUri = chrome.identity.getRedirectURL()
  const { raw: nonce, hashed: hashedNonce } = await createOidcNonce()

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'id_token')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes.join(' '))
  authUrl.searchParams.set('nonce', hashedNonce)
  authUrl.searchParams.set('prompt', 'select_account')

  console.info('[postpilot] Google OAuth redirect URI:', redirectUri)

  const redirectedTo = await chrome.identity.launchWebAuthFlow({
    url: authUrl.href,
    interactive: true,
  })

  if (!redirectedTo) {
    throw new Error('OAuth flow was cancelled.')
  }

  const oauthError = extractOAuthError(redirectedTo)
  if (oauthError) {
    throw new Error(`Google sign-in failed: ${oauthError}`)
  }

  const idToken = extractIdToken(redirectedTo)
  if (!idToken) {
    throw new Error(
      'Google did not return an ID token. Confirm the OAuth client type is "Chrome Extension" and the item ID matches this extension.',
    )
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce,
  })

  if (error || !data.session || !data.user) {
    const hint =
      ' If Supabase rejects the nonce, enable "Skip nonce check" for the Google provider, or add this Chrome Extension client ID under Supabase → Auth → Google → Client IDs.'
    throw new Error((error?.message ?? 'Failed to establish Supabase session.') + hint)
  }

  await persistSession(mapSession(data.session))
  return getAuthState()
}

export async function signOut(): Promise<AuthState> {
  await hydrateSessionCache()
  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
  await persistSession(null)
  return getAuthState()
}

export async function getAccessToken(): Promise<string | null> {
  await hydrateSessionCache()
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    await persistSession(mapSession(data.session))
    return data.session.access_token
  }
  return memorySession?.accessToken ?? null
}
