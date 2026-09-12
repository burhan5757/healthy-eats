import type {
  CancelOrderInput,
  Dish,
  LoginInput,
  Order,
  PlaceOrderInput,
  PublicUser,
} from '@shared/index'

/**
 * Thin fetch wrapper. Components never call fetch directly — everything goes
 * through here (CLAUDE.md §6 principle 2), so auth, errors and the base path
 * are handled in exactly one place.
 */

export class ApiError extends Error {
  // Written out longhand rather than as constructor parameter properties, which
  // `erasableSyntaxOnly` disallows.
  status: number
  fields?: { path: string; message: string }[]

  constructor(message: string, status: number, fields?: { path: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.error ?? 'Something went wrong.', res.status, body.fields)
  }
  return body as T
}

export const api = {
  menu: {
    list: () => request<{ dishes: Dish[] }>('/menu'),
    get: (slug: string) => request<{ dish: Dish }>(`/menu/${slug}`),
  },
  orders: {
    /** Guest checkout — no auth required (CLAUDE.md §10a). */
    place: (input: PlaceOrderInput) =>
      request<{ order: Order }>('/orders', { method: 'POST', body: JSON.stringify(input) }),
    /** Public lookup by order number, per the tracking design. */
    track: (orderNumber: string) =>
      request<{ order: Order }>(`/orders/track/${encodeURIComponent(orderNumber)}`),

    /** Chef + admin: the active kitchen queue. */
    kitchen: () => request<{ orders: Order[] }>('/orders/kitchen'),

    /** Admin only. */
    all: () => request<{ orders: Order[] }>('/orders'),
    stats: () => request<Stats>('/orders/stats'),

    accept: (id: string) => request<{ order: Order }>(`/orders/${id}/accept`, { method: 'POST' }),
    ready: (id: string) => request<{ order: Order }>(`/orders/${id}/ready`, { method: 'POST' }),
    deliver: (id: string) => request<{ order: Order }>(`/orders/${id}/deliver`, { method: 'POST' }),
    cancel: (id: string, input: CancelOrderInput) =>
      request<{ order: Order }>(`/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },

  auth: {
    login: (input: LoginInput) =>
      request<{ user: PublicUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: PublicUser }>('/auth/me'),
  },

  menuAdmin: {
    setAvailability: (id: string, availableToday: boolean) =>
      request<{ dish: Dish }>(`/menu/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availableToday }),
      }),
  },
}

export type Stats = {
  todayRevenue: number
  todayOrders: number
  pending: number
  inKitchen: number
  averageOrderValue: number
  lostToCancellations: number
  daily: { date: string; revenue: number }[]
  topDishes: { name: string; qty: number; revenue: number }[]
}
