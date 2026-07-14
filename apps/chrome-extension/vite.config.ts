import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        sidePanel: 'src/side-panel/sidePanel.html',
        popup: 'src/popup/popup.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
