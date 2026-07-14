import type { PlatformAdapter } from './platforms/index.js'
import { mountInlineWidget, unmountInlineWidget } from './shadowDomManager.js'

let activeAnchor: HTMLElement | null = null
let undoTimeout: number | null = null
let lastReplacement: { original: string; applied: string } | null = null
let streamBuffer = ''

export function startDomObserver(adapter: PlatformAdapter, onGenerate: (action: string) => void) {
  document.addEventListener('mouseup', () => handleSelection(adapter, onGenerate))
  document.addEventListener('keyup', () => handleSelection(adapter, onGenerate))

  const observer = new MutationObserver(() => {
    adapter.findEditableRoots()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AI_STREAM_CHUNK') {
      streamBuffer += message.payload.token as string
      void adapter.insertText(message.payload.token as string)
    }
    if (message.type === 'AI_STREAM_DONE') {
      if (lastReplacement) {
        lastReplacement.applied = streamBuffer
        scheduleUndo(adapter)
      }
      streamBuffer = ''
    }
  })
}

function handleSelection(adapter: PlatformAdapter, onGenerate: (action: string) => void) {
  const selection = adapter.getCurrentSelection()
  if (!selection?.text.trim()) {
    if (activeAnchor) {
      unmountInlineWidget(activeAnchor)
      activeAnchor = null
    }
    return
  }

  const anchor = document.activeElement as HTMLElement | null
  if (!anchor) return

  activeAnchor = anchor
  mountInlineWidget(anchor, (action) => {
    lastReplacement = { original: selection.text, applied: '' }
    streamBuffer = ''
    onGenerate(action)
  })
}

function scheduleUndo(adapter: PlatformAdapter) {
  if (undoTimeout) window.clearTimeout(undoTimeout)
  undoTimeout = window.setTimeout(() => {
    lastReplacement = null
  }, 5000)

  const undoButton = document.createElement('button')
  undoButton.textContent = 'Undo'
  undoButton.style.position = 'fixed'
  undoButton.style.bottom = '16px'
  undoButton.style.right = '16px'
  undoButton.style.zIndex = '2147483647'
  undoButton.style.padding = '8px 12px'
  undoButton.style.borderRadius = '8px'
  undoButton.style.border = '1px solid #e8deff'
  undoButton.style.background = '#ffffff'
  undoButton.style.color = '#4c3880'
  undoButton.style.font = '12px "Avenir Next", Avenir, "Century Gothic", Futura, sans-serif'
  undoButton.style.cursor = 'pointer'
  undoButton.style.boxShadow = '0 10px 28px rgba(76, 56, 128, 0.14)'
  undoButton.onclick = async () => {
    if (lastReplacement) {
      await adapter.replaceSelection(lastReplacement.original)
      lastReplacement = null
      undoButton.remove()
    }
  }
  document.body.appendChild(undoButton)
  window.setTimeout(() => undoButton.remove(), 5000)
}
