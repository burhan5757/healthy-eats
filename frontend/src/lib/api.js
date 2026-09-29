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
 * Which staff role this browser tab is currently acting as. Each staff area
 * (admin/kitchen/driver) has its own cookie on the backend (lib/auth.jsx), so
 * this header tells the server which one to check — that's what lets an
 * admin tab and a driver tab stay signed in side by side in the same browser
 * instead of one login clobbering the other.
 */
const ROLE_HEADER = 'X-Healthy-Eats-Role'
let staffRole = null
export function setStaffRole(role) {
  staffRole = role
}

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

async function request(path, init, role = staffRole) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      // The API refuses writes without this header — a cross-site page can't
      // send it (CSRF guard, CLAUDE.md §18). GETs skip it to avoid a preflight.
      ...(init?.method && init.method !== 'GET'
        ? { 'X-Healthy-Eats': '1' }
        : {}),
      // Sent on GETs too (public pages never set a role, so most GETs still
      // avoid the preflight this adds — only the staff screens pay for it).
      ...(role ? { [ROLE_HEADER]: role } : {}),
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
    /** `role` overrides the active staff role — used to probe a specific
     *  role's cookie (e.g. AuthProvider trying `chef` then `admin` on
     *  /kitchen) without disturbing whichever role is otherwise active. */
    me: (role) => request('/auth/me', undefined, role),
  },

  menuAdmin: {
    setAvailability: (id, availableToday) =>
      request(`/menu/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availableToday }),
      }),
  },
}
