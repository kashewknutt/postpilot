import type { AiGenerateRequest, UsageSummary } from '@postpilot/shared-types'
import { parseSseChunk } from '@postpilot/shared-utils'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

interface StreamHandlers {
  onToken: (token: string) => void
  onDone: (tokensGenerated: number, usage?: UsageSummary) => void
  onError: (message: string, status?: number) => void
}

export async function streamAiGenerate(
  accessToken: string,
  request: AiGenerateRequest,
  handlers: StreamHandlers,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const problem = (await response.json()) as { detail?: string; title?: string }
      if (problem.detail) message = problem.detail
      else if (problem.title) message = problem.title
    } catch {
      // ignore parse errors
    }
    handlers.onError(message, response.status)
    return
  }

  if (!response.body) {
    handlers.onError('Streaming body missing from API response.')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = parseSseChunk(buffer)
    buffer = ''

    for (const event of events) {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>
        if (event.event === 'message' && typeof data.token === 'string') {
          handlers.onToken(data.token)
        } else if (event.event === 'done' && typeof data.tokens_generated === 'number') {
          handlers.onDone(data.tokens_generated, data.usage as UsageSummary | undefined)
        } else if (event.event === 'error' && typeof data.message === 'string') {
          handlers.onError(data.message)
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
