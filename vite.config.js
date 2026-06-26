import { defineConfig } from 'vite'

// The frontend is a plain Vite app. In dev, API calls are proxied to the
// Express "brain" server so the Claude key never reaches the browser.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
})
