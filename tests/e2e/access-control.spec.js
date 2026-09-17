import { expect, test } from './fixtures.js'
import { deliveryFeeFor } from '../../backend/src/shared/index.js'
import { ADMIN as ADMIN_USER, CHEF as CHEF_USER } from './credentials.js'

/**
 * "There is only one admin and no one else has access" is the user's hardest
 * requirement, so it gets its own suite — and it is tested at the API, not just
 * the UI. Hiding a screen is not access control.
 */

const API = 'http://localhost:4000/api'

const ADMIN = [ADMIN_USER.role, ADMIN_USER.email, ADMIN_USER.password]
const CHEF = [CHEF_USER.role, CHEF_USER.email, CHEF_USER.password]

/** Each staff role signs in at its own endpoint: /auth/<role>/login. */
async function login(request, role, email, password) {
  const res = await request.post(`${API}/auth/${role}/login`, {
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
}

/** The public placement response carries no internal id — look it up as admin. */
async function adminOrder(request, orderNumber) {
  await login(request, ...ADMIN)
  const { orders } = await (await request.get(`${API}/orders`)).json()
  return orders.find((o) => o.orderNumber === orderNumber)
}

test.describe('admin-only endpoints', () => {
  test('reject anonymous callers with 401', async ({ request }) => {
    for (const path of ['/orders', '/orders/stats']) {
      const res = await request.get(API + path)
      expect(res.status(), `${path} should be 401`).toBe(401)
    }
  })

  test('reject a signed-in chef with 403', async ({ request }) => {
    await login(request, ...CHEF)

    for (const path of ['/orders', '/orders/stats']) {
      const res = await request.get(API + path)
      expect(res.status(), `${path} should be 403 for chef`).toBe(403)
    }
  })

  test('allow the admin', async ({ request }) => {
    await login(request, ...ADMIN)

    for (const path of ['/orders', '/orders/stats']) {
      const res = await request.get(API + path)
      expect(res.status(), `${path} should be 200 for admin`).toBe(200)
    }
  })

  test('let the chef read the kitchen queue but nothing more', async ({
    request,
  }) => {
    await login(request, ...CHEF)

    expect((await request.get(`${API}/orders/kitchen`)).status()).toBe(200)
    expect((await request.get(`${API}/orders/stats`)).status()).toBe(403)
  })

  test('reject a driver on admin and kitchen routes, and on driver management', async ({
    request,
  }) => {
    await login(request, ...ADMIN)
    const email = `probe-driver-${Date.now()}@example.com`
    const password = 'roadwork123'
    await request.post(`${API}/drivers`, {
      data: {
        name: 'Access Probe Driver',
        phone: '9823011284',
        email,
        password,
      },
    })

    await login(request, 'driver', email, password)
    for (const path of ['/orders', '/orders/stats', '/orders/kitchen']) {
      expect(
        (await request.get(API + path)).status(),
        `${path} should be 403 for driver`,
      ).toBe(403)
    }
    expect((await request.get(`${API}/drivers`)).status()).toBe(403)
    expect(
      (await request.post(`${API}/orders/${'0'.repeat(24)}/accept`)).status(),
    ).toBe(403)
    expect(
      (
        await request.post(`${API}/orders/${'0'.repeat(24)}/cancel`, {
          data: { reason: 'x', soldOutDishIds: [] },
        })
      ).status(),
    ).toBe(403)
  })
})

test.describe('privilege escalation', () => {
  test('there is no self-registration and no catch-all login', async ({
    request,
  }) => {
    const probe = {
      name: 'Probe User',
      email: `probe-${Date.now()}@example.com`,
      password: 'secret12345',
      role: 'admin',
    }
    expect(
      (await request.post(`${API}/auth/register`, { data: probe })).status(),
    ).toBe(404)
    expect(
      (await request.post(`${API}/auth/login`, { data: probe })).status(),
    ).toBe(404)
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

    await login(request, ...CHEF)
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
          lat: 18.52,
          lng: 73.82,
        },
      },
    })
    const { order: placed } = await created.json()
    const order = await adminOrder(request, placed.orderNumber)

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
          lat: 18.52,
          lng: 73.82,
        },
      },
    })

    const { order } = await res.json()
    expect(order.subtotal).toBe(dish.price * 2)
    // ₹10 per started km from the kitchen, priced by the server from the pin.
    expect(order.deliveryFee).toBe(deliveryFeeFor({ lat: 18.52, lng: 73.82 }))
    expect(order.total).toBe(
      order.subtotal + order.deliveryFee + order.packaging,
    )
  })

  test('an order without a map pin is refused — delivery cannot be priced', async ({
    request,
  }) => {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dish = menu.dishes.find((d) => d.availableToday)
    const res = await request.post(`${API}/orders`, {
      data: {
        items: [{ dishId: dish.id, qty: 1 }],
        address: {
          name: 'No Pin Probe',
          phone: '9823011284',
          line1: 'Flat 1, Some Building, Kothrud',
          pincode: '411038',
        },
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(JSON.stringify(body.fields)).toMatch(/Drop a pin/)
  })
})

test.describe('payment status (COD ledger)', () => {
  async function placeOrder(request, phone) {
    const menu = await (await request.get(`${API}/menu`)).json()
    const dish = menu.dishes.find((d) => d.availableToday)

    const res = await request.post(`${API}/orders`, {
      data: {
        items: [{ dishId: dish.id, qty: 1 }],
        address: {
          name: 'Payment Probe',
          phone,
          line1: 'Flat 1, Some Building, Kothrud',
          pincode: '411038',
          lat: 18.52,
          lng: 73.82,
        },
      },
    })
    const { order } = await res.json()
    return adminOrder(request, order.orderNumber)
  }

  test('is pending on placement and collected on delivery', async ({
    request,
  }) => {
    const order = await placeOrder(request, '9823011284')
    expect(order.payment).toMatchObject({ method: 'cod', status: 'pending' })

    await request.post(`${API}/orders/${order.id}/accept`)
    await request.post(`${API}/orders/${order.id}/ready`)
    const delivered = await request.post(`${API}/orders/${order.id}/deliver`)
    const { order: deliveredOrder } = await delivered.json()

    expect(deliveredOrder.payment.status).toBe('collected')
    expect(deliveredOrder.payment.collectedAt).toBeTruthy()
  })

  test('is voided when the order is cancelled', async ({ request }) => {
    const order = await placeOrder(request, '9823011285')

    const cancelled = await request.post(`${API}/orders/${order.id}/cancel`, {
      data: { reason: 'kitchen at capacity', soldOutDishIds: [] },
    })
    const { order: cancelledOrder } = await cancelled.json()

    expect(cancelledOrder.payment.status).toBe('void')
    expect(cancelledOrder.payment.voidedAt).toBeTruthy()
  })
})

test.describe('dish images', () => {
  test('rejects a malformed image id with 400, not a crash', async ({
    request,
  }) => {
    const res = await request.get(`${API}/images/not-an-object-id`)
    expect(res.status()).toBe(400)
  })

  test('returns 404 for a well-formed id that does not exist', async ({
    request,
  }) => {
    const res = await request.get(`${API}/images/${'0'.repeat(24)}`)
    expect(res.status()).toBe(404)
  })
})
