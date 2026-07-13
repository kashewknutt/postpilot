import type {
  AiGenerateMessagePayload,
  AiGenerateRequest,
  AuthState,
  ExtensionMessage,
} from '@postpilot/shared-types'
import { getAuthState, initializeAuth, signInWithGoogle, signOut } from './auth.js'
import { streamAiGenerate } from './streamClient.js'

type MessageResponse = unknown

export function registerMessageBroker(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    void handleMessage(message)
      .then((response) => sendResponse({ ok: true, data: response }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }))
    return true
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
    case 'AI_GENERATE':
      return handleAiGenerate(message.payload as AiGenerateMessagePayload)
    default:
      throw new Error(`Unsupported message type: ${message.type}`)
  }
}

async function handleAiGenerate(payload: AiGenerateMessagePayload): Promise<{ started: boolean }> {
  const auth = await initializeAuth()
  if (!auth.isAuthenticated || !auth.session) {
    throw new Error('Authentication required.')
  }

  const port = chrome.runtime.connect({ name: 'ai-stream' })
  void streamAiGenerate(auth.session.accessToken, payload.request, {
    onToken: (token) => {
      port.postMessage({ type: 'AI_STREAM_CHUNK', payload: { token } })
      if (payload.tabId) {
        void chrome.tabs.sendMessage(payload.tabId, {
          type: 'AI_STREAM_CHUNK',
          payload: { token },
        })
      }
    },
    onDone: (tokensGenerated) => {
      port.postMessage({
        type: 'AI_STREAM_DONE',
        payload: { tokens_generated: tokensGenerated },
      })
      if (payload.tabId) {
        void chrome.tabs.sendMessage(payload.tabId, {
          type: 'AI_STREAM_DONE',
          payload: { tokens_generated: tokensGenerated },
        })
      }
      port.disconnect()
    },
    onError: (message, status) => {
      port.postMessage({ type: 'AI_STREAM_ERROR', payload: { message, status } })
      if (payload.tabId) {
        void chrome.tabs.sendMessage(payload.tabId, {
          type: 'AI_STREAM_ERROR',
          payload: { message, status },
        })
      }
      port.disconnect()
    },
  })

  return { started: true }
}

export async function getCurrentAuthState(): Promise<AuthState> {
  return initializeAuth()
}

export type { AiGenerateRequest }
