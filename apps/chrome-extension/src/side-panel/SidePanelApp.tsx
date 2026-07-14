import { useEffect, useMemo, useState } from 'react'
import { detectPlatformFromUrl, FREE_MONTHLY_GENERATIONS } from '@postpilot/shared-utils'
import type { PlatformId, PromptAction, UsageSummary } from '@postpilot/shared-types'
import { Button } from '../shared/components/Button'
import { Spinner } from '../shared/components/Spinner'
import { useAuth } from '../shared/hooks/useAuth'
import '../shared/styles.css'

const PLATFORM_PROMPTS: Record<string, PromptAction[]> = {
  linkedin: ['professional', 'rewrite', 'expand', 'shorten'],
  x: ['casual', 'rewrite', 'shorten'],
  'youtube-studio': ['expand', 'rewrite', 'professional'],
}

export function SidePanelApp() {
  const { authState, setup, loading, error, signIn, signOut } = useAuth()
  const [platform, setPlatform] = useState<PlatformId | null>(null)
  const [prompt, setPrompt] = useState('')
  const [streamOutput, setStreamOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const refreshUsage = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'USAGE_GET' })
    if (response?.ok) {
      setUsage(response.data as UsageSummary)
    }
  }

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return
      setPlatform(detectPlatformFromUrl(tab.url))
    })
  }, [])

  useEffect(() => {
    if (authState.isAuthenticated) {
      void refreshUsage()
    } else {
      setUsage(null)
    }
  }, [authState.isAuthenticated])

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'ai-stream' })
    port.onMessage.addListener((message) => {
      if (message.type === 'AI_STREAM_CHUNK') {
        setStreamOutput((prev) => prev + message.payload.token)
      }
      if (message.type === 'AI_STREAM_DONE') {
        setStreaming(false)
        if (message.payload?.usage) {
          setUsage(message.payload.usage as UsageSummary)
        } else {
          void refreshUsage()
        }
      }
      if (message.type === 'AI_STREAM_ERROR') {
        setStreaming(false)
        setStreamOutput((prev) => `${prev}\n\nError: ${message.payload.message}`)
        if (message.payload?.status === 402) {
          void refreshUsage()
        }
      }
    })
    return () => port.disconnect()
  }, [])

  const quickPrompts = useMemo<PromptAction[]>(
    () => (platform ? (PLATFORM_PROMPTS[platform] ?? ['rewrite']) : ['rewrite']),
    [platform],
  )

  const freeLimitReached = Boolean(usage && !usage.isSubscribed && usage.remainingFree <= 0)

  const handleGenerate = async (action: PromptAction) => {
    if (!prompt.trim() || !platform) return
    if (freeLimitReached) {
      setBillingError(
        `You've used your ${FREE_MONTHLY_GENERATIONS} free generations this month. Upgrade to continue.`,
      )
      return
    }
    setBillingError(null)
    setStreaming(true)
    setStreamOutput('')
    await chrome.runtime.sendMessage({
      type: 'AI_GENERATE',
      payload: {
        request: { platform, action, content: prompt },
      },
    })
  }

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    setBillingError(null)
    const response = await chrome.runtime.sendMessage({ type: 'BILLING_CHECKOUT' })
    setCheckoutLoading(false)
    if (!response?.ok) {
      setBillingError(response?.error ?? 'Unable to start checkout.')
      return
    }
    const checkoutUrl = (response.data as { checkoutUrl?: string }).checkoutUrl
    if (checkoutUrl) {
      await chrome.tabs.create({ url: checkoutUrl })
    }
  }

  const pullSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? '',
    })
    const result = results[0]?.result
    if (typeof result === 'string' && result) setPrompt(result)
  }

  const copyExtensionId = async () => {
    if (!setup?.extensionId) return
    await navigator.clipboard.writeText(setup.extensionId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-surface-ink">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 text-surface-ink">
      <header className="mb-5 border-b border-surface-300 pb-4">
        <p className="font-display text-2xl font-semibold tracking-tight text-brand-800">
          Postpilot
        </p>
        <p className="mt-1 text-sm text-surface-muted">
          {platform ? `Active platform: ${platform}` : 'Open a supported editor tab'}
        </p>
      </header>

      {!authState.isAuthenticated ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-surface-soft">Sign in to start generating content.</p>
            <p className="text-xs text-surface-muted">
              New accounts get {FREE_MONTHLY_GENERATIONS} free generations every month.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button className="w-full" onClick={() => void signIn()}>
            Sign in with Google
          </Button>

          {setup && (
            <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-3 text-xs text-surface-soft">
              <p className="font-medium text-brand-800">Google setup</p>
              <p>
                Extension ID:{' '}
                <button
                  type="button"
                  className="font-mono text-brand-700 underline decoration-brand-300"
                  onClick={() => void copyExtensionId()}
                >
                  {setup.extensionId}
                </button>
                {copied ? ' · copied' : ''}
              </p>
              <p className="text-surface-muted">
                Use this ID for a Chrome Extension OAuth client in Google Cloud, then set{' '}
                <span className="font-mono">VITE_GOOGLE_OAUTH_CLIENT_ID</span> and rebuild.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-surface-soft">{authState.session?.email}</span>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>

          {usage && (
            <div className="rounded-lg border border-brand-200 bg-brand-50/80 px-3 py-2 text-xs text-brand-800">
              {usage.isSubscribed ? (
                <span>Pro plan · unlimited generations</span>
              ) : (
                <span>
                  Free plan · {usage.remainingFree} of {usage.freeAllowance} generations left this
                  month
                </span>
              )}
            </div>
          )}

          {freeLimitReached && (
            <div className="space-y-2 rounded-lg border border-brand-300 bg-white p-3 shadow-soft">
              <p className="text-sm text-surface-ink">
                You&apos;ve used your {FREE_MONTHLY_GENERATIONS} free generations this month.
              </p>
              <p className="text-xs text-surface-muted">
                Upgrade to keep rewriting without limits.
              </p>
              <Button disabled={checkoutLoading} onClick={() => void handleUpgrade()}>
                {checkoutLoading ? <Spinner /> : 'Upgrade to Pro'}
              </Button>
            </div>
          )}

          {billingError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {billingError}
            </p>
          )}

          <textarea
            className="h-32 w-full rounded-lg border border-surface-300 bg-white p-3 text-sm text-surface-ink placeholder:text-surface-muted shadow-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Write or paste your draft..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void pullSelection()}>
              Pull selection
            </Button>
            {quickPrompts.map((action) => (
              <Button
                key={action}
                disabled={streaming || freeLimitReached}
                onClick={() => void handleGenerate(action)}
              >
                {streaming ? <Spinner /> : action}
              </Button>
            ))}
          </div>

          <div className="min-h-24 rounded-lg border border-surface-300 bg-white p-3 text-sm whitespace-pre-wrap text-surface-soft shadow-soft">
            {streamOutput || 'Generated output will stream here.'}
          </div>
        </div>
      )}
    </div>
  )
}
