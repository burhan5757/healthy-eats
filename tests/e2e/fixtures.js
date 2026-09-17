import { test as base } from '@playwright/test'
import { CSRF_HEADERS, TEST_OTP_CODE } from './credentials.js'

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

const API = 'http://localhost:4000/api'

let phoneCounter = 0
/** A valid Indian mobile number no other test (or earlier run) has used. */
export function uniquePhone() {
  phoneCounter += 1
  const tail = (Date.now() % 1e6) * 100 + (phoneCounter % 100)
  return `9${String(tail).padStart(9, '0')}`
}

const tokens = new Map()
/** Verifies `phone` with the test SMS code and returns the phoneToken for POST /orders. */
export async function phoneToken(request, phone) {
  if (tokens.has(phone)) return tokens.get(phone)
  const sent = await request.post(`${API}/otp/send`, { data: { phone } })
  if (!sent.ok())
    throw new Error(`otp/send ${sent.status()}: ${await sent.text()}`)
  const verified = await request.post(`${API}/otp/verify`, {
    data: { phone, code: TEST_OTP_CODE },
  })
  if (!verified.ok()) {
    throw new Error(`otp/verify ${verified.status()}: ${await verified.text()}`)
  }
  const { phoneToken: token } = await verified.json()
  tokens.set(phone, token)
  return token
}
