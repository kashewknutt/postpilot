import { useCallback, useEffect, useState } from 'react'
import type { AuthState } from '@postpilot/shared-types'

export interface AuthSetupInfo {
  extensionId: string
  redirectUrl: string
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    session: null,
  })
  const [setup, setSetup] = useState<AuthSetupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [stateResponse, setupResponse] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'AUTH_GET_STATE' }),
      chrome.runtime.sendMessage({ type: 'AUTH_GET_SETUP' }),
    ])
    if (!stateResponse?.ok) {
      setError(stateResponse?.error ?? 'Failed to load auth state.')
      setLoading(false)
      return
    }
    setAuthState(stateResponse.data as AuthState)
    if (setupResponse?.ok) {
      setSetup(setupResponse.data as AuthSetupInfo)
    }
    setLoading(false)
  }, [])

  const signIn = useCallback(async () => {
    setLoading(true)
    setError(null)
    const response = await chrome.runtime.sendMessage({ type: 'AUTH_SIGN_IN' })
    if (!response?.ok) {
      setError(response?.error ?? 'Sign in failed.')
      setLoading(false)
      return
    }
    setAuthState(response.data as AuthState)
    setLoading(false)
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    const response = await chrome.runtime.sendMessage({ type: 'AUTH_SIGN_OUT' })
    if (!response?.ok) {
      setError(response?.error ?? 'Sign out failed.')
      setLoading(false)
      return
    }
    setAuthState(response.data as AuthState)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { authState, setup, loading, error, refresh, signIn, signOut }
}
