import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Client modules under test import shared code by alias, as the app does.
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    // Unit tests for the shared contract — the code both client and server
    // depend on, and therefore the code most worth pinning down.
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
