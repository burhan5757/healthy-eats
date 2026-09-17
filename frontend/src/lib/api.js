/**
 * Thin fetch wrapper. Components never call fetch directly — everything goes
 * through here (CLAUDE.md §6 principle 2), so auth, errors and the base path
 * are handled in exactly one place.
 *
 * VITE_API_URL is empty by default, which keeps today's relative /api path
 * (the Vite dev proxy forwards it). Set it when the frontend and backend are
 * hosted on separate domains — see CLAUDE.md's production-wiring note.
 */
const BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Resolves a backend-relative asset path (e.g. a dish's `/api/images/<id>`)
 * against the same origin the API calls use. Empty/absolute paths pass through.
 */
export function assetUrl(path) {
  if (!path) return path
  if (/^https?:\/\//.test(path)) return path
  return `${BASE}${path}`
}

export class ApiError extends Error {
  constructor(message, status, fields, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    /** The whole error response, for extras like `retryAfterSeconds`. */
    this.body = body
  }
}

async function request(path, init) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      // The API refuses writes without this header — a cross-site page can't
      // send it (CSRF guard, CLAUDE.md §18). GETs skip it to avoid a preflight.
      ...(init?.method && init.method !== 'GET'
        ? { 'X-Healthy-Eats': '1' }
        : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      body.error ?? 'Something went wrong.',
      res.status,
      body.fields,
      body,
    )
  }
  return body
}

export const api = {
  /** Whether the kitchen is taking orders right now. */
  orderingStatus: () => request('/ordering-status'),

  menu: {
    list: () => request('/menu'),
    get: (slug) => request(`/menu/${slug}`),
  },
  /** Guest phone verification by SMS code (CLAUDE.md §23). */
  otp: {
    send: (phone) =>
      request('/otp/send', { method: 'POST', body: JSON.stringify({ phone }) }),
    verify: (phone, code) =>
      request('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),
  },

  orders: {
    /** Guest checkout — no auth required (CLAUDE.md §10a). */
    place: (input) =>
      request('/orders', { method: 'POST', body: JSON.stringify(input) }),
    /** Public lookup by order number, per the tracking design. */
    track: (orderNumber) =>
      request(`/orders/track/${encodeURIComponent(orderNumber)}`),

    /** Chef + admin: the active kitchen queue. */
    kitchen: () => request('/orders/kitchen'),

    /** Admin only. */
    all: () => request('/orders'),
    stats: () => request('/orders/stats'),

    accept: (id) => request(`/orders/${id}/accept`, { method: 'POST' }),
    ready: (id) => request(`/orders/${id}/ready`, { method: 'POST' }),
    deliver: (id) => request(`/orders/${id}/deliver`, { method: 'POST' }),
    cancel: (id, input) =>
      request(`/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    /** Admin: `driverId: null` unassigns. */
    assign: (id, driverId) =>
      request(`/orders/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      }),

    /** Driver only: READY orders assigned to the signed-in driver. */
    driverQueue: () => request('/orders/driver'),
    driverAccept: (id) =>
      request(`/orders/${id}/driver-accept`, { method: 'POST' }),
  },

  /** Admin only. */
  drivers: {
    list: () => request('/drivers'),
    create: (input) =>
      request('/drivers', { method: 'POST', body: JSON.stringify(input) }),
    setActive: (id, active) =>
      request(`/drivers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
  },

  auth: {
    /** Staff sign-in; `role` picks the endpoint and only that role is accepted. */
    login: (role, input) =>
      request(`/auth/${role}/login`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
  },

  menuAdmin: {
    setAvailability: (id, availableToday) =>
      request(`/menu/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availableToday }),
      }),
  },
}
