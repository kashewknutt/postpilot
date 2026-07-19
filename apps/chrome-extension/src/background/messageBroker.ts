import type {
  AiGenerateMessagePayload,
  AiGenerateRequest,
  AuthState,
  ExtensionMessage,
  UsageSummary,
} from '@postpilot/shared-types'
import {
  initializeAuth,
  signInWithGoogle,
  signOut,
  getAccessToken,
  getExtensionId,
  getOAuthRedirectUrl,
} from './auth.js'
import { streamAiGenerate } from './streamClient.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

type MessageResponse = unknown

let aiStreamPort: chrome.runtime.Port | null = null

export function registerMessageBroker(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    void handleMessage(message)
      .then((response) => sendResponse({ ok: true, data: response }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }))
    return true
  })

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'ai-stream') return
    aiStreamPort = port
    port.onDisconnect.addListener(() => {
      if (aiStreamPort === port) aiStreamPort = null
    })
  })
}

async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  switch (message.type) {
    case 'PING':
      return { pong: true }
    case 'AUTH_GET_STATE':
      return initializeAuth()
    case 'AUTH_SIGN_IN':
      return signInWithGoogle()
    case 'AUTH_SIGN_OUT':
      return signOut()
    case 'AUTH_GET_SETUP':
      return {
        extensionId: getExtensionId(),
        redirectUrl: getOAuthRedirectUrl(),
      }
    case 'USAGE_GET':
      return fetchUsage()
    case 'BILLING_CHECKOUT':
      return startCheckout()
    case 'AI_GENERATE':
      return handleAiGenerate(message.payload as AiGenerateMessagePayload)
    default:
      throw new Error(`Unsupported message type: ${message.type}`)
  }
}

async function requireAccessToken(): Promise<string> {
  await initializeAuth()
  const token = await getAccessToken()
  if (!token) throw new Error('Authentication required.')
  return token
}

async function fetchUsage(): Promise<UsageSummary> {
  const token = await requireAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/v1/billing/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`Failed to load usage (${response.status})`)
  }
  return (await response.json()) as UsageSummary
}

async function startCheckout(): Promise<{ checkoutUrl: string }> {
  const token = await requireAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/v1/billing/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    let detail = `Checkout failed (${response.status})`
    try {
      const problem = (await response.json()) as { detail?: string }
      if (problem.detail) detail = problem.detail
    } catch {
      // ignore
    }
    throw new Error(detail)
  }
  return (await response.json()) as { checkoutUrl: string }
}

async function handleAiGenerate(payload: AiGenerateMessagePayload): Promise<{ started: boolean }> {
  const token = await requireAccessToken()

  void streamAiGenerate(token, payload.request, {
    onToken: (token) => {
      aiStreamPort?.postMessage({ type: 'AI_STREAM_CHUNK', payload: { token } })
      if (payload.tabId) {
        void chrome.tabs.sendMessage(payload.tabId, {
          type: 'AI_STREAM_CHUNK',
          payload: { token },
        })
      }
    },
    onDone: (tokensGenerated, usage) => {
      aiStreamPort?.postMessage({
        type: 'AI_STREAM_DONE',
        payload: { tokens_generated: tokensGenerated, usage },
      })
      if (payload.tabId) {
        void chrome.tabs.sendMessage(payload.tabId, {
          type: 'AI_STREAM_DONE',
          payload: { tokens_generated: tokensGenerated, usage },
        })
      }
    },
    onError: (message, status) => {
      aiStreamPort?.postMessage({ type: 'AI_STREAM_ERROR', payload: { message, status } })
      if (payload.tabId) {
        void chrome.tabs.sendMessage(payload.tabId, {
          type: 'AI_STREAM_ERROR',
          payload: { message, status },
        })
      }
    },
  })

  return { started: true }
}

export async function getCurrentAuthState(): Promise<AuthState> {
  return initializeAuth()
}

export type { AiGenerateRequest }
