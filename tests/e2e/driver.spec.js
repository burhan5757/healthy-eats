import { request as pwRequest } from '@playwright/test'
import { expect, phoneToken, test } from './fixtures.js'
import { ADMIN, CHEF, CSRF_HEADERS } from './credentials.js'

/**
 * Driver accounts, assignment and closeout — asserted at the API, same style as
 * access-control.spec.js and order-lifecycle.spec.js. Admin creates every driver
 * (there is no driver self-signup); a driver may only touch orders assigned to
 * them; an unassigned order still closes out through admin as before.
 */

const API = 'http://localhost:4000/api'

/** Staff sign in at /auth/<role>/login; each endpoint accepts only that role. */
async function login(request, email, password, role) {
  role ??=
    email === ADMIN.email ? 'admin' : email === CHEF.email ? 'chef' : 'driver'
  const res = await request.post(`${API}/auth/${role}/login`, {
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
}

async function createDriver(request, overrides = {}) {
  await login(request, ADMIN.email, ADMIN.password)
  const email = `driver-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  const password = 'roadwork123'
  const res = await request.post(`${API}/drivers`, {
    data: {
      name: 'Test Driver',
      phone: '9823011284',
      email,
      password,
      ...overrides,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const { driver } = await res.json()
  return { ...driver, email, password }
}

async function placeOrder(request, phone = '9823011286') {
  const menu = await (await request.get(`${API}/menu`)).json()
  const dish = menu.dishes.find((d) => d.availableToday)
  const res = await request.post(`${API}/orders`, {
    data: {
      items: [{ dishId: dish.id, qty: 1 }],
      phoneToken: await phoneToken(request, phone),
      address: {
        name: 'Driver Test Customer',
        phone,
        line1: 'Flat 5, Some Building, Kothrud',
        pincode: '411038',
        lat: 18.52,
        lng: 73.82,
      },
    },
  })
  const { order } = await res.json()
  // The public placement response has no internal id; admin looks it up.
  await login(request, ADMIN.email, ADMIN.password)
  const { orders } = await (await request.get(`${API}/orders`)).json()
  return orders.find((o) => o.orderNumber === order.orderNumber)
}

/** Drives an order to READY as admin+chef, using a fresh phone per test. */
async function orderReadyForPickup(request, phone) {
  const order = await placeOrder(request, phone)
  await login(request, ADMIN.email, ADMIN.password)
  await request.post(`${API}/orders/${order.id}/accept`)
  await login(request, CHEF.email, CHEF.password)
  await request.post(`${API}/orders/${order.id}/ready`)
  return order
}

test.describe('driver accounts are admin-only', () => {
  test('a non-admin gets 403 creating or listing drivers', async ({
    request,
  }) => {
    await login(request, CHEF.email, CHEF.password)
    expect((await request.get(`${API}/drivers`)).status()).toBe(403)
    expect(
      (
        await request.post(`${API}/drivers`, {
          data: {
            name: 'X',
            phone: '9823011284',
            email: 'x@example.com',
            password: 'password1',
          },
        })
      ).status(),
    ).toBe(403)
  })

  test('nobody can self-register as a driver', async ({ request }) => {
    const email = `probe-driver-${Date.now()}@example.com`
    const res = await request.post(`${API}/auth/register`, {
      data: { name: 'Probe', email, password: 'secret12345', role: 'driver' },
    })
    expect(res.status()).toBe(404)
  })

  test('admin creates a driver and it appears in the list', async ({
    request,
  }) => {
    const driver = await createDriver(request)
    const list = await (await request.get(`${API}/drivers`)).json()
    expect(list.drivers.map((d) => d.id)).toContain(driver.id)
  })
})

test.describe('assigning a driver', () => {
  test('fails on an order that is not ready', async ({ request }) => {
    const driver = await createDriver(request)
    const order = await placeOrder(request, '9823011287')

    await login(request, ADMIN.email, ADMIN.password)
    const res = await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: driver.id },
    })
    expect(res.status()).toBe(409)
  })

  test('rejects a non-driver or inactive driver id', async ({ request }) => {
    const order = await orderReadyForPickup(request, '9823011288')
    await login(request, ADMIN.email, ADMIN.password)

    const bogus = await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: '0'.repeat(24) },
    })
    expect(bogus.status()).toBe(400)

    const driver = await createDriver(request)
    await login(request, ADMIN.email, ADMIN.password)
    await request.patch(`${API}/drivers/${driver.id}`, {
      data: { active: false },
    })
    const inactive = await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: driver.id },
    })
    expect(inactive.status()).toBe(400)
  })

  test('succeeds once ready, and shows up in the driver queue', async ({
    request,
  }) => {
    const driver = await createDriver(request)
    const order = await orderReadyForPickup(request, '9823011289')

    await login(request, ADMIN.email, ADMIN.password)
    const assign = await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: driver.id },
    })
    expect(assign.ok()).toBeTruthy()

    await login(request, driver.email, driver.password)
    const queue = await (await request.get(`${API}/orders/driver`)).json()
    expect(queue.orders.map((o) => o.id)).toContain(order.id)
  })
})

test.describe('one driver cannot touch another driver’s order', () => {
  test('read, accept and deliver all 403 for the wrong driver', async ({
    request,
  }) => {
    const driverA = await createDriver(request)
    const driverB = await createDriver(request)
    const order = await orderReadyForPickup(request, '9823011290')

    await login(request, ADMIN.email, ADMIN.password)
    await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: driverA.id },
    })

    await login(request, driverB.email, driverB.password)
    expect((await request.get(`${API}/orders/${order.id}`)).status()).toBe(403)
    expect(
      (await request.post(`${API}/orders/${order.id}/driver-accept`)).status(),
    ).toBe(403)
    expect(
      (await request.post(`${API}/orders/${order.id}/deliver`)).status(),
    ).toBe(403)

    const queue = await (await request.get(`${API}/orders/driver`)).json()
    expect(queue.orders.map((o) => o.id)).not.toContain(order.id)
  })
})

test.describe('accept then deliver', () => {
  test('deliver fails before accept, for both driver and admin', async ({
    request,
  }) => {
    const driver = await createDriver(request)
    const order = await orderReadyForPickup(request, '9823011291')

    await login(request, ADMIN.email, ADMIN.password)
    await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: driver.id },
    })

    // Driver hasn't accepted yet.
    await login(request, driver.email, driver.password)
    expect(
      (await request.post(`${API}/orders/${order.id}/deliver`)).status(),
    ).toBe(409)

    // Admin can't close it out either — it's assigned to a driver now.
    await login(request, ADMIN.email, ADMIN.password)
    expect(
      (await request.post(`${API}/orders/${order.id}/deliver`)).status(),
    ).toBe(409)
  })

  test('accept then deliver marks the order delivered and payment collected', async ({
    request,
  }) => {
    const driver = await createDriver(request)
    const order = await orderReadyForPickup(request, '9823011292')

    await login(request, ADMIN.email, ADMIN.password)
    await request.post(`${API}/orders/${order.id}/assign`, {
      data: { driverId: driver.id },
    })

    await login(request, driver.email, driver.password)
    const accept = await request.post(`${API}/orders/${order.id}/driver-accept`)
    expect(accept.ok()).toBeTruthy()

    const deliver = await request.post(`${API}/orders/${order.id}/deliver`)
    expect(deliver.ok()).toBeTruthy()
    const { order: delivered } = await deliver.json()
    expect(delivered.status).toBe('delivered')
    expect(delivered.driver.acceptedAt).toBeTruthy()

    await login(request, ADMIN.email, ADMIN.password)
    const all = await (await request.get(`${API}/orders`)).json()
    const found = all.orders.find((o) => o.id === order.id)
    expect(found.payment.status).toBe('collected')
  })
})

test.describe('unassigned orders still close out through admin', () => {
  test('admin delivers an order with no driver assigned', async ({
    request,
  }) => {
    const order = await orderReadyForPickup(request, '9823011293')
    await login(request, ADMIN.email, ADMIN.password)
    const deliver = await request.post(`${API}/orders/${order.id}/deliver`)
    expect(deliver.ok()).toBeTruthy()
  })
})

test.describe('a deactivated driver is locked out', () => {
  test('cannot log in, and an existing session is refused on driver routes', async ({
    request,
  }) => {
    const driver = await createDriver(request)

    // A separate context so the driver's session cookie survives the admin
    // logging in below in the shared `request` context.
    const driverSession = await pwRequest.newContext({
      extraHTTPHeaders: CSRF_HEADERS,
    })
    await login(driverSession, driver.email, driver.password)
    expect((await driverSession.get(`${API}/orders/driver`)).status()).toBe(200)

    await login(request, ADMIN.email, ADMIN.password)
    await request.patch(`${API}/drivers/${driver.id}`, {
      data: { active: false },
    })

    const loginAgain = await request.post(`${API}/auth/driver/login`, {
      data: { email: driver.email, password: driver.password },
    })
    expect(loginAgain.status()).toBe(401)

    // Deactivation ended the session, so the old, unexpired JWT is dead too.
    expect((await driverSession.get(`${API}/orders/driver`)).status()).toBe(401)
    await driverSession.dispose()
  })
})
