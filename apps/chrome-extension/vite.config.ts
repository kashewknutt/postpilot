import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'node:path'
import manifest from './manifest.json'

const rootEnvDir = resolve(__dirname, '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '')
  const googleClientId =
    env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
    'YOUR_CHROME_EXTENSION_GOOGLE_CLIENT_ID.apps.googleusercontent.com'

  return {
    envDir: rootEnvDir,
    plugins: [
      react(),
      crx({
        manifest: {
          ...manifest,
          oauth2: {
            ...manifest.oauth2,
            client_id: googleClientId,
          },
        },
      }),
    ],
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
  }
})
