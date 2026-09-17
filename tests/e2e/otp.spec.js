import { expect, phoneToken, test, uniquePhone } from './fixtures.js'
import { TEST_OTP_CODE } from './credentials.js'

/**
 * Guest orders need a phone verified by SMS code (CLAUDE.md §23). The test
 * server uses the no-send provider, whose code is always TEST_OTP_CODE.
 */

const API = 'http://localhost:4000/api'

async function orderBody(request, phone, token) {
  const menu = await (await request.get(`${API}/menu`)).json()
  const dish = menu.dishes.find((d) => d.availableToday)
  return {
    items: [{ dishId: dish.id, qty: 1 }],
    address: {
      name: 'OTP Probe',
      phone,
      line1: 'Flat 3, Some Building, Kothrud',
      pincode: '411038',
      lat: 18.51,
      lng: 73.81,
    },
    ...(token ? { phoneToken: token } : {}),
  }
}

test.describe('phone verification', () => {
  test('checkout is told verification is required', async ({ request }) => {
    const res = await request.get(`${API}/ordering-status`)
    expect((await res.json()).phoneVerification).toBe(true)
  })

  test('an order without a verified phone is refused', async ({ request }) => {
    const phone = uniquePhone()
    const res = await request.post(`${API}/orders`, {
      data: await orderBody(request, phone),
    })
    expect(res.status()).toBe(401)
  })

  test('a forged token is refused', async ({ request }) => {
    const phone = uniquePhone()
    const res = await request.post(`${API}/orders`, {
      data: await orderBody(request, phone, 'not.a.token'),
    })
    expect(res.status()).toBe(401)
  })

  test("one phone's token does not work for another phone", async ({
    request,
  }) => {
    const token = await phoneToken(request, uniquePhone())
    const res = await request.post(`${API}/orders`, {
      data: await orderBody(request, uniquePhone(), token),
    })
    expect(res.status()).toBe(401)
  })

  test('the right code gives a token that places the order', async ({
    request,
  }) => {
    const phone = uniquePhone()
    const token = await phoneToken(request, phone)
    const res = await request.post(`${API}/orders`, {
      data: await orderBody(request, phone, token),
    })
    expect(res.status()).toBe(201)
  })

  test('a code cannot be re-requested straight away', async ({ request }) => {
    const phone = uniquePhone()
    const first = await request.post(`${API}/otp/send`, { data: { phone } })
    expect(first.ok()).toBeTruthy()
    const again = await request.post(`${API}/otp/send`, { data: { phone } })
    expect(again.status()).toBe(429)
    expect((await again.json()).retryAfterSeconds).toBeGreaterThan(0)
  })

  test('wrong codes are counted, and too many void the code', async ({
    request,
  }) => {
    const phone = uniquePhone()
    await request.post(`${API}/otp/send`, { data: { phone } })
    const verify = (code) =>
      request.post(`${API}/otp/verify`, { data: { phone, code } })

    expect((await verify('12345')).status()).toBe(400) // malformed
    for (let i = 0; i < 5; i++) {
      expect((await verify('000000')).status()).toBe(400)
    }
    // Even the right code no longer works: a new one must be requested.
    expect((await verify(TEST_OTP_CODE)).status()).toBe(429)
    expect((await verify(TEST_OTP_CODE)).status()).toBe(400)
  })

  test('one phone can only have a few orders open at once', async ({
    request,
  }) => {
    const phone = uniquePhone()
    const token = await phoneToken(request, phone)
    const place = async () =>
      request.post(`${API}/orders`, {
        data: await orderBody(request, phone, token),
      })
    for (let i = 0; i < 3; i++) expect((await place()).status()).toBe(201)
    expect((await place()).status()).toBe(429)
  })
})
