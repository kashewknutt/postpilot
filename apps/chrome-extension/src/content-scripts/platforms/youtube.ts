import type { PlatformId, SelectionPayload } from '@postpilot/shared-types'
import { YOUTUBE_SELECTORS } from './youtube.selectors.js'

export const youtubeAdapter = {
  platform: 'youtube-studio' as PlatformId,
  match(url: string) {
    return url.includes('studio.youtube.com')
  },
  findEditableRoots() {
    const nodes: HTMLElement[] = []
    for (const selector of YOUTUBE_SELECTORS.editableRoots) {
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
      platform: 'youtube-studio',
    }
  },
  async replaceSelection(nextText: string) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(nextText))
    selection.removeAllRanges()
  },
  async insertText(nextText: string) {
    const active = document.activeElement as HTMLElement | null
    if (!active) return
    active.focus()
    document.execCommand('insertText', false, nextText)
  },
}
