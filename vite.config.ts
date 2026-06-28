import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Gideon frontend — TanStack Router (file-based) on Vite, as a calm SPA.
// (Browser-only voice + the CSS orb make SSR unnecessary; this keeps the whole
// product one fluid client app. The mock API in src/lib/api swaps cleanly for
// the real Go backend; `/api` is proxied to the Express brain in dev.)
const srcDir = fileURLToPath(new URL('./src', import.meta.url)).replace(/\\/g, '/')

export default defineConfig({
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8787' },
  },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    viteReact(),
    tailwindcss(),
  ],
})
