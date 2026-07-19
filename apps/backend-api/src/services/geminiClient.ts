import type { Environment } from '../config/environment.js'

interface GenerateInput {
  platform: string
  action: string
  content: string
}

const ACTION_PROMPTS: Record<string, string> = {
  rewrite: 'Rewrite the following content while preserving meaning.',
  shorten: 'Shorten the following content while keeping key points.',
  expand: 'Expand the following content with more detail and clarity.',
  professional:
    'Rewrite the following content in a polished, professional tone suitable for a LinkedIn post from an industry expert.',
  casual: 'Rewrite the following content in a casual, friendly tone.',
  informal:
    'Rewrite the following content in a relaxed, informal, conversational voice, as if talking directly to a friend or peer.',
  steps:
    'Rewrite the following content as a clear step-by-step breakdown. Number each step (1., 2., 3., ...) on its own line, in the order a reader should follow them.',
  storytelling:
    'Rewrite the following content as a short, engaging narrative with a clear beginning, middle, and end, the way a compelling LinkedIn story post reads.',
  custom: 'Improve the following content for social media publishing.',
}

const OUTPUT_RULES = [
  'Output exactly one finished post, ready to publish as-is.',
  'Do not offer multiple options or alternatives.',
  'Do not use markdown formatting: no asterisks, bold, italics, headers, blockquotes, or bullet markers.',
  'Do not add preamble, explanations, labels, or commentary about what you changed.',
  'Plain text only, using line breaks for paragraphs where natural.',
].join(' ')

export async function* streamGeminiCompletion(
  env: Environment,
  input: GenerateInput,
): AsyncGenerator<string> {
  const systemPrompt = ACTION_PROMPTS[input.action] ?? ACTION_PROMPTS.custom
  const prompt = `${systemPrompt}\n\n${OUTPUT_RULES}\n\nPlatform: ${input.platform}\n\nContent:\n${input.content}`

  if (!env.GEMINI_API_KEY) {
    const stub = `[${input.action}] ${input.content}`
    for (const word of stub.split(' ')) {
      await delay(40)
      yield `${word} `
    }
    return
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    },
  )

  if (!response.ok || !response.body) {
    const details = response.body ? await response.text() : 'empty body'
    console.error('[gemini] request failed', response.status, details.slice(0, 300))
    // Fall back to deterministic stub so local/dev flows still work
    const stub = `[${input.action}] ${input.content}`
    for (const word of stub.split(' ')) {
      await delay(40)
      yield `${word} `
    }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue

      try {
        const parsed = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          yield text
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
