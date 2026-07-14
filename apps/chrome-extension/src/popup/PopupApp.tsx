import { Button } from '../shared/components/Button'
import { Spinner } from '../shared/components/Spinner'
import { useAuth } from '../shared/hooks/useAuth'
import '../shared/styles.css'

export function PopupApp() {
  const { authState, loading, error, signIn, signOut } = useAuth()

  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    await chrome.sidePanel.open({ tabId: tab.id })
  }

  if (loading) {
    return (
      <div className="flex h-40 w-72 items-center justify-center text-surface-ink">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-72 space-y-3 p-4 text-surface-ink">
      <h1 className="font-display text-lg font-semibold text-brand-800">Postpilot</h1>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
      {authState.isAuthenticated ? (
        <>
          <p className="truncate text-xs text-surface-muted">{authState.session?.email}</p>
          <Button className="w-full" onClick={() => void openSidePanel()}>
            Open side panel
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </>
      ) : (
        <Button className="w-full" onClick={() => void signIn()}>
          Sign in with Google
        </Button>
      )}
    </div>
  )
}
