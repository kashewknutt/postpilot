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
      <div className="flex h-40 w-72 items-center justify-center bg-surface-950 text-surface-soft">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-72 space-y-3 bg-surface-950 p-4 text-surface-soft">
      <h1 className="text-base font-semibold text-brand-100">Postpilot</h1>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {authState.isAuthenticated ? (
        <>
          <p className="text-xs text-brand-200">{authState.session?.email}</p>
          <Button className="w-full" onClick={() => void openSidePanel()}>
            Open side panel
          </Button>
          <Button className="w-full" onClick={() => void signOut()}>
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
