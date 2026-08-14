import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Unit tests for the shared contract — the code both client and server
    // depend on, and therefore the code most worth pinning down.
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
