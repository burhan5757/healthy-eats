import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Frontend modules under test import shared code by alias, as the app does.
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    // Unit tests for the shared contract — the code both frontend and backend
    // depend on, and therefore the code most worth pinning down.
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    // A stale include glob (e.g. after a file-extension change) would
    // otherwise pass silently with zero tests run — fail loudly instead.
    passWithNoTests: false,
  },
})
