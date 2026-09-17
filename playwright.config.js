import { defineConfig, devices } from '@playwright/test'
import { TEST_SERVER_ENV } from './tests/e2e/credentials.js'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // the tests share one kitchen queue
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Two servers, each gated on its own readiness check. access-control.spec.js
  // hits the API directly (http://localhost:4000), so waiting on the frontend
  // alone left a startup race where the first test could reach a cold API
  // before it was listening — this fixes that pre-existing gap.
  webServer: [
    {
      command: 'npm run dev:backend',
      url: 'http://localhost:4000/api/health',
      // Force the in-memory database regardless of backend/.env — e2e tests
      // place, cancel and mark-sold-out real orders/dishes, and must never do
      // that against Atlas. dotenv never overrides an already-set env var.
      env: { ...TEST_SERVER_ENV, MONGODB_URI: '' },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
