import type { PlatformId, ProblemDetails } from '@postpilot/shared-types'

export const MAX_CONTENT_LENGTH = 3000

/** Free AI generations available each calendar month for unsubscribed users. */
export const FREE_MONTHLY_GENERATIONS = 5

export function isActiveSubscriptionStatus(status: string): boolean {
  return status === 'active' || status === 'trialing'
}

export function createProblemDetails(
  type: string,
  title: string,
  status: number,
  detail: string,
  instance: string,
  invalidParams?: Array<{ name: string; reason: string }>,
): ProblemDetails {
  return {
    type,
    title,
    status,
    detail,
    instance,
    ...(invalidParams ? { invalid_params: invalidParams } : {}),
  }
}

export function validateContentLength(content: string): string | null {
  if (!content.trim()) {
    return 'Content must not be empty.'
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return `Content must contain at most ${MAX_CONTENT_LENGTH} characters.`
  }
  return null
}

export function detectPlatformFromUrl(url: string): PlatformId | null {
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('linkedin.com')) return 'linkedin'
    if (hostname === 'x.com' || hostname === 'twitter.com') return 'x'
    if (hostname === 'studio.youtube.com') return 'youtube-studio'
    return null
  } catch {
    return null
  }
}

export function parseSseChunk(chunk: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = []
  const blocks = chunk.split('\n\n').filter(Boolean)

  for (const block of blocks) {
    const lines = block.split('\n')
    let event = 'message'
    let data = ''

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim()
      }
    }

    if (data) {
      events.push({ event, data })
    }
  }

  return events
}
