import { createRoot, type Root } from 'react-dom/client'
import { InlineWidget } from './inlineWidget.js'

const hosts = new WeakMap<HTMLElement, { host: HTMLElement; root: Root }>()

export function mountInlineWidget(anchor: HTMLElement, onAction: (action: string) => void) {
  if (hosts.has(anchor)) return

  const host = document.createElement('postpilot-inline-widget')
  host.style.all = 'initial'
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    .toolbar {
      position: absolute;
      z-index: 2147483647;
      display: flex;
      gap: 6px;
      padding: 6px;
      border-radius: 10px;
      background: #ffffff;
      color: #221833;
      font: 12px/1.2 "Avenir Next", Avenir, "Century Gothic", Futura, sans-serif;
      box-shadow: 0 10px 28px rgba(76, 56, 128, 0.14);
      border: 1px solid #e8deff;
    }
    button {
      border: 0;
      border-radius: 8px;
      padding: 6px 8px;
      background: #9370db;
      color: white;
      cursor: pointer;
    }
    button:hover { background: #a78bfa; }
  `

  const mountPoint = document.createElement('div')
  shadow.append(style, mountPoint)
  document.body.appendChild(host)

  const root = createRoot(mountPoint)
  root.render(<InlineWidget onAction={onAction} />)
  hosts.set(anchor, { host, root })
}

export function unmountInlineWidget(anchor: HTMLElement) {
  const mounted = hosts.get(anchor)
  if (!mounted) return
  mounted.root.unmount()
  mounted.host.remove()
  hosts.delete(anchor)
}
