import type { PlatformId, SelectionPayload } from '@postpilot/shared-types'
import { linkedinAdapter } from './linkedin.js'
import { xAdapter } from './x.js'
import { youtubeAdapter } from './youtube.js'

export interface PlatformAdapter {
  platform: PlatformId
  match(url: string): boolean
  findEditableRoots(): HTMLElement[]
  getCurrentSelection(): SelectionPayload | null
  replaceSelection(nextText: string): Promise<void>
  insertText(nextText: string): Promise<void>
}

const adapters: PlatformAdapter[] = [linkedinAdapter, xAdapter, youtubeAdapter]

export function getAdapterForUrl(url: string): PlatformAdapter | null {
  return adapters.find((adapter) => adapter.match(url)) ?? null
}

export function getAllAdapters(): PlatformAdapter[] {
  return adapters
}
