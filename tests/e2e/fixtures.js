import { test as base } from '@playwright/test'
import { CSRF_HEADERS } from './credentials.js'

export { expect } from '@playwright/test'

/**
 * `request` sends the API's CSRF header, like the real frontend does. Only the
 * API context gets it — browser pages already send it via lib/api.js, and a
 * global extra header would also hit third-party map tiles.
 */
export const test = base.extend({
  request: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      extraHTTPHeaders: CSRF_HEADERS,
    })
    await use(ctx)
    await ctx.dispose()
  },
})
