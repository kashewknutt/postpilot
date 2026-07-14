export type PlatformId = 'linkedin' | 'x' | 'youtube-studio'

export type PromptAction =
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'professional'
  | 'casual'
  | 'custom'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'past_due'
  | 'incomplete'
  | 'none'

export interface SelectionPayload {
  text: string
  startOffset: number
  endOffset: number
  platform: PlatformId
}

export interface AiGenerateRequest {
  platform: PlatformId
  action: PromptAction
  content: string
}

export interface SseMessageEvent {
  token: string
}

export interface SseDoneEvent {
  tokens_generated: number
  usage?: UsageSummary
}

export interface UsageSummary {
  plan: 'free' | 'pro'
  usedThisMonth: number
  freeAllowance: number
  remainingFree: number
  isSubscribed: boolean
}

export interface SseErrorEvent {
  message: string
}

export type SseEventType = 'message' | 'error' | 'done'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
  email: string
}

export interface AuthState {
  isAuthenticated: boolean
  session: AuthSession | null
}

export interface CheckoutRequest {
  priceId: string
}

export interface CheckoutResponse {
  checkoutUrl: string
}

export interface PortalResponse {
  portalUrl: string
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  invalid_params?: Array<{ name: string; reason: string }>
}

export interface PlatformAdapterContract {
  platform: PlatformId
  match(url: string): boolean
}

export type ExtensionMessageType =
  | 'AUTH_GET_STATE'
  | 'AUTH_SIGN_IN'
  | 'AUTH_SIGN_OUT'
  | 'AI_GENERATE'
  | 'AI_STREAM_CHUNK'
  | 'AI_STREAM_DONE'
  | 'AI_STREAM_ERROR'
  | 'USAGE_GET'
  | 'BILLING_CHECKOUT'
  | 'GET_ACTIVE_PLATFORM'
  | 'PING'

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType
  payload?: T
}

export interface AiGenerateMessagePayload {
  request: AiGenerateRequest
  tabId?: number
}

export interface AiStreamChunkPayload {
  token: string
}

export interface AiStreamDonePayload {
  tokens_generated: number
}

export interface AiStreamErrorPayload {
  message: string
  status?: number
}
