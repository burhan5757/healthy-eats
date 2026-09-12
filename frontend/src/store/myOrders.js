const KEY = 'healthy-eats-orders'

/**
 * Order numbers this browser has placed.
 *
 * Guest checkout means there is no account to hang order history on, so the
 * browser remembers its own order numbers. The tracking page still works for
 * anyone who types the number in — this just saves the customer doing so.
 */

export function rememberOrder(orderNumber        )       {
  const all = myOrders()
  if (all.includes(orderNumber)) return
  localStorage.setItem(KEY, JSON.stringify([orderNumber, ...all].slice(0, 20)))
}

export function myOrders()           {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x)              => typeof x === 'string') : []
  } catch {
    return []
  }
}
