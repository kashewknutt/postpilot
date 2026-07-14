import type { PlatformId, SelectionPayload } from '@postpilot/shared-types'
import { X_SELECTORS } from './x.selectors.js'

export const xAdapter = {
  platform: 'x' as PlatformId,
  match(url: string) {
    return url.includes('x.com') || url.includes('twitter.com')
  },
  findEditableRoots() {
    const nodes: HTMLElement[] = []
    for (const selector of X_SELECTORS.editableRoots) {
      document.querySelectorAll<HTMLElement>(selector).forEach((node) => nodes.push(node))
    }
    return nodes
  },
  getCurrentSelection(): SelectionPayload | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
    return {
      text: selection.toString(),
      startOffset: selection.anchorOffset,
      endOffset: selection.focusOffset,
      platform: 'x',
    }
  },
  async replaceSelection(nextText: string) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    range.deleteContents()
    document.execCommand('insertText', false, nextText)
  },
  async insertText(nextText: string) {
    const active = document.activeElement as HTMLElement | null
    if (!active) return
    active.focus()
    document.execCommand('insertText', false, nextText)
  },
}
