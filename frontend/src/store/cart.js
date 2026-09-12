import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE, PACKAGING_FEE } from '@shared/index'

/**
 * The cart is purely local state — no account required, matching the checkout
 * design's "NO ACCOUNT NEEDED". It survives refresh via localStorage.
 *
 * Only identity and quantity are authoritative here. Prices are snapshotted for
 * display, but the SERVER recomputes every total from the database when the
 * order is placed, so a tampered cart cannot change what is charged.
 */

export const useCart = create()(
  persist(
    (set) => ({
      lines: [],

      add: (dish) =>
        set((state) => {
          const existing = state.lines.find((l) => l.dishId === dish.id)
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.dishId === dish.id ? { ...l, qty: l.qty + 1 } : l,
              ),
            }
          }
          return {
            lines: [
              ...state.lines,
              {
                dishId: dish.id,
                slug: dish.slug,
                name: dish.name,
                price: dish.price,
                kcal: dish.nutrition?.kcal,
                protein: dish.nutrition?.protein,
                qty: 1,
              },
            ],
          }
        }),

      setQty: (dishId, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.dishId !== dishId)
              : state.lines.map((l) =>
                  l.dishId === dishId ? { ...l, qty } : l,
                ),
        })),

      remove: (dishId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.dishId !== dishId),
        })),

      clear: () => set({ lines: [] }),
    }),
    { name: 'healthy-eats-cart', version: 1 },
  ),
)

/* --- Derived values -------------------------------------------------------- */

export function cartCount(lines) {
  return lines.reduce((n, l) => n + l.qty, 0)
}

export function cartSubtotal(lines) {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0)
}

/** Mirrors the server's calculation so the UI never shows a different number. */
export function cartTotals(lines) {
  const subtotal = cartSubtotal(lines)

  // An empty cart costs nothing. Without the length guard a subtotal of 0 falls
  // below the free-delivery threshold and picks up a delivery fee.
  const empty = lines.length === 0
  const deliveryFee =
    empty || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE
  const packaging = empty ? 0 : PACKAGING_FEE

  return {
    subtotal,
    deliveryFee,
    packaging,
    total: subtotal + deliveryFee + packaging,
  }
}

/** Quantity of one dish, for the menu card steppers. */
export function useQtyOf(dishId) {
  return useCart((s) => s.lines.find((l) => l.dishId === dishId)?.qty ?? 0)
}
