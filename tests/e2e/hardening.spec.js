import { request as pwRequest } from '@playwright/test'
import { expect, test } from './fixtures.js'
import { ADMIN, CHEF, CSRF_HEADERS } from './credentials.js'

/**
 * Role-locked staff logins, and keeping order numbers + customer details away
 * from anyone who isn't holding them (CLAUDE.md §10, §10b).
 */

const API = 'http://localhost:4000/api'

async function placeOrder(request, phone) {
  const menu = await (await request.get(`${API}/menu`)).json()
  const dish = menu.dishes.find((d) => d.availableToday)
  const res = await request.post(`${API}/orders`, {
    data: {
      items: [{ dishId: dish.id, qty: 1 }],
      address: {
        name: 'Privacy Probe',
        phone,
        line1: 'Flat 9, Some Building, Kothrud',
        pincode: '411038',
        lat: 18.51,
        lng: 73.81,
      },
    },
  })
  expect(res.status()).toBe(201)
  return (await res.json()).order
}

test.describe('each staff role has its own login endpoint', () => {
  test('credentials only work at their own role’s endpoint', async ({
    request,
  }) => {
    const attempt = (path, { email, password }) =>
      request.post(`${API}/auth/${path}`, { data: { email, password } })

    expect((await attempt('admin/login', ADMIN)).status()).toBe(200)
    expect((await attempt('chef/login', CHEF)).status()).toBe(200)

    // Right password, wrong door.
    for (const [path, who] of [
      ['chef/login', ADMIN],
      ['driver/login', ADMIN],
      ['admin/login', CHEF],
      ['driver/login', CHEF],
    ]) {
      const res = await attempt(path, who)
      expect(res.status(), `${who.email} at /${path}`).toBe(401)
      // Indistinguishable from a wrong password — no hint the account exists.
      expect((await res.json()).error).toBe('Incorrect email or password.')
    }
  })

  test('a driver can only sign in at the driver endpoint', async ({
    request,
  }) => {
    await request.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    const driver = {
      email: `hardening-driver-${Date.now()}@example.com`,
      password: 'roadwork123',
    }
    const created = await request.post(`${API}/drivers`, {
      data: { name: 'Hardening Driver', phone: '9823011299', ...driver },
    })
    expect(created.ok()).toBeTruthy()

    for (const path of ['admin/login', 'chef/login']) {
      const res = await request.post(`${API}/auth/${path}`, { data: driver })
      expect(res.status(), `driver at /${path}`).toBe(401)
    }
    const ok = await request.post(`${API}/auth/driver/login`, { data: driver })
    expect(ok.status()).toBe(200)
  })

  test('each staff screen redirects to its own login page', async ({
    page,
  }) => {
    for (const [screen, login] of [
      ['/admin', '/admin/login'],
      ['/kitchen', '/kitchen/login'],
      ['/driver', '/driver/login'],
    ]) {
      await page.goto(screen)
      await expect(page).toHaveURL(new RegExp(`${login}$`))
    }
  })
})

test.describe('order numbers are not traceable', () => {
  test('are long random codes, and the public view hides internal details', async ({
    request,
  }) => {
    const placed = await placeOrder(request, '9823011277')

    expect(placed.orderNumber).toMatch(/^HE-[2-9A-HJ-NP-Z]{8}$/)
    for (const order of [
      placed,
      (
        await (
          await request.get(`${API}/orders/track/${placed.orderNumber}`)
        ).json()
      ).order,
    ]) {
      expect(order).not.toHaveProperty('id')
      expect(order).not.toHaveProperty('customerId')
      expect(order).not.toHaveProperty('payment')
      expect(order.address).not.toHaveProperty('phone')
      expect(JSON.stringify(order)).not.toContain('9823011277')
      // What the customer's own tracking page needs is still there.
      expect(order.address.line1).toBeTruthy()
      expect(order.status).toBe('placed')
    }
  })

  test('two orders never share a pattern an attacker could walk', async ({
    request,
  }) => {
    const a = await placeOrder(request, '9823011278')
    const b = await placeOrder(request, '9823011279')
    expect(a.orderNumber).not.toBe(b.orderNumber)
  })

  test('short or malformed numbers are rejected without a lookup', async ({
    request,
  }) => {
    for (const guess of ['HE-4821', 'HE-0000', 'HE-AAAAAAAA0', '1', '%24ne']) {
      const res = await request.get(`${API}/orders/track/${guess}`)
      expect(res.status(), guess).toBe(404)
    }
  })

  test('live socket broadcasts carry no order numbers or customer details', async ({
    page,
    request,
  }) => {
    const frames = []
    page.on('websocket', (ws) =>
      ws.on('framereceived', (f) => frames.push(String(f.payload))),
    )
    // Any page that listens for order events — an anonymous visitor's.
    await page.goto('/track/HE-22222222')
    // Wait for the Socket.IO handshake itself ("40{…}"), not just any frame —
    // Vite's dev websocket also sends frames, and the page loads lazily.
    await expect.poll(() => frames.some((f) => f.startsWith('40'))).toBe(true)

    const placed = await placeOrder(request, '9823011266')
    await request.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    const { orders } = await (await request.get(`${API}/orders`)).json()
    const { id } = orders.find((o) => o.orderNumber === placed.orderNumber)
    const accepted = await request.post(`${API}/orders/${id}/accept`)
    expect(accepted.status(), await accepted.text()).toBe(200)

    await expect
      .poll(() => frames.filter((f) => f.includes('order:')).length)
      .toBeGreaterThanOrEqual(2)

    const all = frames.join('\n')
    expect(all).not.toContain(placed.orderNumber)
    expect(all).not.toContain('9823011266')
    expect(all).not.toContain('Privacy Probe')
    expect(all).not.toContain(id)
  })
})

test.describe('session and request hardening', () => {
  test('writes without the CSRF header, or from a foreign origin, are refused', async () => {
    const bare = await pwRequest.newContext()
    const noHeader = await bare.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(noHeader.status()).toBe(403)
    await bare.dispose()

    const foreign = await pwRequest.newContext({
      extraHTTPHeaders: { ...CSRF_HEADERS, Origin: 'https://evil.example' },
    })
    const fromEvil = await foreign.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(fromEvil.status()).toBe(403)
    await foreign.dispose()

    const ours = await pwRequest.newContext({
      extraHTTPHeaders: { ...CSRF_HEADERS, Origin: 'http://localhost:5173' },
    })
    const fromUs = await ours.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(fromUs.status()).toBe(200)
    await ours.dispose()
  })

  test('repeated wrong passwords for one account are rate limited', async ({
    request,
  }) => {
    const email = `brute-${Date.now()}@example.com`
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${API}/auth/driver/login`, {
        data: { email, password: `wrong-guess-${i}` },
      })
      expect(res.status(), `attempt ${i + 1}`).toBe(401)
    }
    const blocked = await request.post(`${API}/auth/driver/login`, {
      data: { email, password: 'wrong-guess-6' },
    })
    expect(blocked.status()).toBe(429)
    expect((await blocked.json()).error).toMatch(/too many/i)

    // Other accounts from the same place are unaffected.
    const admin = await request.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(admin.status()).toBe(200)
  })

  test('logging out kills the token, even if someone kept a copy', async () => {
    const ctx = await pwRequest.newContext({ extraHTTPHeaders: CSRF_HEADERS })
    await ctx.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect((await ctx.get(`${API}/auth/me`)).status()).toBe(200)
    const stolen = await ctx.storageState()

    expect((await ctx.post(`${API}/auth/logout`)).status()).toBe(200)
    await ctx.dispose()

    const replay = await pwRequest.newContext({
      extraHTTPHeaders: CSRF_HEADERS,
      storageState: stolen,
    })
    expect((await replay.get(`${API}/auth/me`)).status()).toBe(401)
    expect((await replay.get(`${API}/orders`)).status()).toBe(401)
    await replay.dispose()
  })

  test('signing in on a second device does not sign out the first', async () => {
    const a = await pwRequest.newContext({ extraHTTPHeaders: CSRF_HEADERS })
    const b = await pwRequest.newContext({ extraHTTPHeaders: CSRF_HEADERS })
    for (const ctx of [a, b]) {
      await ctx.post(`${API}/auth/chef/login`, {
        data: { email: CHEF.email, password: CHEF.password },
      })
    }
    await b.post(`${API}/auth/logout`)
    expect((await a.get(`${API}/orders/kitchen`)).status()).toBe(200)
    expect((await b.get(`${API}/orders/kitchen`)).status()).toBe(401)
    await a.dispose()
    await b.dispose()
  })

  test('API responses carry security headers', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['strict-transport-security']).toBeTruthy()
    expect(headers['x-frame-options']).toBeTruthy()
    expect(headers['x-powered-by']).toBeUndefined()
  })
})

test.describe('malformed input is refused cleanly', () => {
  test('a malformed order or dish id is a 404, never a 500', async ({
    request,
  }) => {
    await request.post(`${API}/auth/admin/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    for (const [method, path] of [
      ['get', '/orders/not-an-id'],
      ['post', '/orders/not-an-id/accept'],
      ['post', '/orders/not-an-id/deliver'],
      ['post', '/orders/not-an-id/assign'],
      ['patch', '/menu/not-an-id/availability'],
    ]) {
      const res = await request[method](`${API}${path}`, {
        data: { availableToday: true, driverId: null },
      })
      expect(res.status(), `${method} ${path}`).toBe(404)
    }
  })

  test('oversized or malformed orders are a 400', async ({ request }) => {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dish = menu.dishes.find((d) => d.availableToday)
    const address = {
      name: 'Limit Probe',
      phone: '9823011255',
      line1: 'Flat 9, Some Building, Kothrud',
      pincode: '411038',
      lat: 18.51,
      lng: 73.81,
    }
    for (const items of [
      [{ dishId: 'not-an-id', qty: 1 }],
      [{ dishId: dish.id, qty: 21 }],
      Array.from({ length: 31 }, (_, i) => ({
        dishId: String(i).padStart(24, '0'),
        qty: 1,
      })),
      [
        { dishId: dish.id, qty: 1 },
        { dishId: dish.id, qty: 1 },
      ],
    ]) {
      const res = await request.post(`${API}/orders`, {
        data: { items, address },
      })
      expect(res.status(), JSON.stringify(items)).toBe(400)
    }
  })
})

test.describe('where and when orders are taken', () => {
  test('a pin beyond the delivery limit is refused', async ({ request }) => {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dish = menu.dishes.find((d) => d.availableToday)
    const res = await request.post(`${API}/orders`, {
      data: {
        items: [{ dishId: dish.id, qty: 1 }],
        address: {
          name: 'Far Away',
          phone: '9823011256',
          line1: 'Somewhere in Nashik, far off',
          pincode: '422001',
          lat: 19.99,
          lng: 73.79,
        },
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(JSON.stringify(body.fields)).toMatch(/more than 25 km/)
  })

  test('the ordering status comes from the server', async ({ request }) => {
    const res = await request.get(`${API}/ordering-status`)
    expect(res.ok()).toBeTruthy()
    // The test server turns hours enforcement off, so it is always open.
    expect(await res.json()).toMatchObject({
      open: true,
      opensAt: expect.stringMatching(/^\d\d:\d\d$/),
      lastOrderAt: expect.stringMatching(/^\d\d:\d\d$/),
    })
  })
})
