import type { AiGenerateRequest, PromptAction } from '@postpilot/shared-types'
import { getAdapterForUrl } from './platforms/index.js'
import { startDomObserver } from './domObserver.js'

const adapter = getAdapterForUrl(window.location.href)

if (adapter) {
  startDomObserver(adapter, (action) => {
    const selection = adapter.getCurrentSelection()
    if (!selection?.text.trim()) return

    const request: AiGenerateRequest = {
      platform: adapter.platform,
      action: action as PromptAction,
      content: selection.text,
    }

    void chrome.runtime.sendMessage({
      type: 'AI_GENERATE',
      payload: { request },
    })
  })
}

console.debug('[postpilot] content script active for', adapter?.platform ?? 'unknown')
