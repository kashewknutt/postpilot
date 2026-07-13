import { useCallback, useEffect, useState } from 'react'
import type { AuthState } from '@postpilot/shared-types'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    session: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const response = await chrome.runtime.sendMessage({ type: 'AUTH_GET_STATE' })
    if (!response?.ok) {
      setError(response?.error ?? 'Failed to load auth state.')
      setLoading(false)
      return
    }
    setAuthState(response.data as AuthState)
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

  return { authState, loading, error, refresh, signIn, signOut }
}
