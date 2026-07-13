import { useEffect, useMemo, useState } from 'react'
import { detectPlatformFromUrl } from '@postpilot/shared-utils'
import type { PlatformId, PromptAction } from '@postpilot/shared-types'
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
  const { authState, loading, error, signIn, signOut } = useAuth()
  const [platform, setPlatform] = useState<PlatformId | null>(null)
  const [prompt, setPrompt] = useState('')
  const [streamOutput, setStreamOutput] = useState('')
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return
      setPlatform(detectPlatformFromUrl(tab.url))
    })
  }, [])

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'ai-stream' })
    port.onMessage.addListener((message) => {
      if (message.type === 'AI_STREAM_CHUNK') {
        setStreamOutput((prev) => prev + message.payload.token)
      }
      if (message.type === 'AI_STREAM_DONE') {
        setStreaming(false)
      }
      if (message.type === 'AI_STREAM_ERROR') {
        setStreaming(false)
        setStreamOutput((prev) => `${prev}\n\nError: ${message.payload.message}`)
      }
    })
    return () => port.disconnect()
  }, [])

  const quickPrompts = useMemo<PromptAction[]>(
    () => (platform ? (PLATFORM_PROMPTS[platform] ?? ['rewrite']) : ['rewrite']),
    [platform],
  )

  const handleGenerate = async (action: PromptAction) => {
    if (!prompt.trim() || !platform) return
    setStreaming(true)
    setStreamOutput('')
    await chrome.runtime.sendMessage({
      type: 'AI_GENERATE',
      payload: {
        request: { platform, action, content: prompt },
      },
    })
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950 text-surface-soft">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 p-4 text-surface-soft">
      <header className="mb-4 border-b border-surface-800 pb-4">
        <h1 className="text-lg font-semibold text-brand-100">Postpilot</h1>
        <p className="text-sm text-surface-muted">
          {platform ? `Active platform: ${platform}` : 'Open a supported editor tab'}
        </p>
      </header>

      {!authState.isAuthenticated ? (
        <div className="space-y-3">
          <p className="text-sm text-brand-200">Sign in to start generating content.</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={() => void signIn()}>Sign in with Google</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-brand-200">
            <span>{authState.session?.email}</span>
            <Button onClick={() => void signOut()}>Sign out</Button>
          </div>

          <textarea
            className="h-32 w-full rounded-md border border-surface-700 bg-surface-900 p-3 text-sm text-surface-soft placeholder:text-surface-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Write or paste your draft..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void pullSelection()}>Pull selection</Button>
            {quickPrompts.map((action) => (
              <Button key={action} disabled={streaming} onClick={() => void handleGenerate(action)}>
                {streaming ? <Spinner /> : action}
              </Button>
            ))}
          </div>

          <div className="min-h-24 rounded-md border border-surface-800 bg-surface-900 p-3 text-sm whitespace-pre-wrap text-brand-50">
            {streamOutput || 'Generated output will stream here.'}
          </div>
        </div>
      )}
    </div>
  )
}
