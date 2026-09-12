import { expect, test } from '@playwright/test'

/**
 * "There is only one admin and no one else has access" is the user's hardest
 * requirement, so it gets its own suite — and it is tested at the API, not just
 * the UI. Hiding a screen is not access control.
 */

const API = 'http://localhost:4000/api'

async function login(request, email, password) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
}

test.describe('admin-only endpoints', () => {
  test('reject anonymous callers with 401', async ({ request }) => {
    for (const path of ['/orders', '/orders/stats']) {
      const res = await request.get(API + path)
      expect(res.status(), `${path} should be 401`).toBe(401)
    }
  })

  test('reject a signed-in chef with 403', async ({ request }) => {
    await login(request, 'chef@healthyeats.in', 'chef123')

    for (const path of ['/orders', '/orders/stats']) {
      const res = await request.get(API + path)
      expect(res.status(), `${path} should be 403 for chef`).toBe(403)
    }
  })

  test('allow the admin', async ({ request }) => {
    await login(request, 'admin@healthyeats.in', 'admin123')

    for (const path of ['/orders', '/orders/stats']) {
      const res = await request.get(API + path)
      expect(res.status(), `${path} should be 200 for admin`).toBe(200)
    }
  })

  test('let the chef read the kitchen queue but nothing more', async ({
    request,
  }) => {
    await login(request, 'chef@healthyeats.in', 'chef123')

    expect((await request.get(`${API}/orders/kitchen`)).status()).toBe(200)
    expect((await request.get(`${API}/orders/stats`)).status()).toBe(403)
  })
})

test.describe('privilege escalation', () => {
  test('registering with role:"admin" still creates a customer', async ({
    request,
  }) => {
    const email = `probe-${Date.now()}@example.com`

    const res = await request.post(`${API}/auth/register`, {
      data: { name: 'Probe User', email, password: 'secret123', role: 'admin' },
    })

    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.user.role).toBe('customer')
  })

  test('a registered customer cannot reach admin data', async ({ request }) => {
    const email = `probe-${Date.now()}@example.com`
    await request.post(`${API}/auth/register`, {
      data: { name: 'Probe User', email, password: 'secret123' },
    })

    expect((await request.get(`${API}/orders/stats`)).status()).toBe(403)
    expect((await request.get(`${API}/orders/kitchen`)).status()).toBe(403)
  })

  test('menu availability cannot be changed without admin rights', async ({
    request,
  }) => {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dishId = menu.dishes[0].id

    const anonymous = await request.patch(
      `${API}/menu/${dishId}/availability`,
      {
        data: { availableToday: false },
      },
    )
    expect(anonymous.status()).toBe(401)

    await login(request, 'chef@healthyeats.in', 'chef123')
    const asChef = await request.patch(`${API}/menu/${dishId}/availability`, {
      data: { availableToday: false },
    })
    expect(asChef.status()).toBe(403)
  })
})

test.describe('state machine is enforced server-side', () => {
  test('an order cannot be cancelled once it is ready', async ({ request }) => {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dish = menu.dishes.find((d) => d.availableToday)

    const created = await request.post(`${API}/orders`, {
      data: {
        items: [{ dishId: dish.id, qty: 1 }],
        address: {
          name: 'State Machine Probe',
          phone: '9823011284',
          line1: 'Flat 1, Some Building, Kothrud',
          pincode: '411038',
        },
      },
    })
    const { order } = await created.json()

    await login(request, 'admin@healthyeats.in', 'admin123')
    expect(
      (await request.post(`${API}/orders/${order.id}/accept`)).status(),
    ).toBe(200)

    // Skipping straight to delivered must fail — the food isn't cooked.
    expect(
      (await request.post(`${API}/orders/${order.id}/deliver`)).status(),
    ).toBe(409)

    expect(
      (await request.post(`${API}/orders/${order.id}/ready`)).status(),
    ).toBe(200)

    // Now it is cooked, cancelling must fail.
    const cancel = await request.post(`${API}/orders/${order.id}/cancel`, {
      data: { reason: 'changed my mind', soldOutDishIds: [] },
    })
    expect(cancel.status()).toBe(409)
    expect((await cancel.json()).error).toMatch(/already cooked/i)

    await request.post(`${API}/orders/${order.id}/deliver`)
  })

  test('totals are computed by the server, not taken from the client', async ({
    request,
  }) => {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dish = menu.dishes.find((d) => d.availableToday)

    const res = await request.post(`${API}/orders`, {
      data: {
        // A tampered price here must be ignored entirely.
        items: [{ dishId: dish.id, qty: 2, price: 1 }],
        address: {
          name: 'Pricing Probe',
          phone: '9823011284',
          line1: 'Flat 1, Some Building, Kothrud',
          pincode: '411038',
        },
      },
    })

    const { order } = await res.json()
    expect(order.subtotal).toBe(dish.price * 2)
    expect(order.total).toBe(
      order.subtotal + order.deliveryFee + order.packaging,
    )
  })
})
