import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // A committed copy inside src/, not the sibling ../shared/ — this
      // package builds and deploys standalone with no outside folder needed.
      // Canonical source is repo-root shared/index.js; see
      // scripts/sync-shared.mjs and CLAUDE.md §2b.
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
})
