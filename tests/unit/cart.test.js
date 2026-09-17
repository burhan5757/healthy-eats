import { describe, expect, it } from 'vitest'
import {
  BRAND,
  DELIVERY_FEE_PER_KM,
  PACKAGING_FEE,
  orderTotals,
} from '../../frontend/src/shared/index.js'

/**
 * `orderTotals` is the one formula: the server charges with it and checkout
 * displays it, so testing it here covers both sides.
 */

// ~0.009° of latitude ≈ 1 km in Pune.
const pinKmNorth = (km) => ({
  lat: BRAND.geo.lat + km * 0.009,
  lng: BRAND.geo.lng,
})

describe('order totals', () => {
  it('is entirely zero for an empty cart', () => {
    expect(orderTotals([], pinKmNorth(3))).toEqual({
      subtotal: 0,
      deliveryFee: 0,
      packaging: 0,
      total: 0,
    })
  })

  it('adds distance delivery and packaging to an order', () => {
    // Lean Chicken Thali + Paneer & Brown Rice, ~2.7 km away → 3 billable km.
    const t = orderTotals(
      [
        { price: 229, qty: 1 },
        { price: 179, qty: 1 },
      ],
      pinKmNorth(2.7),
    )
    expect(t.subtotal).toBe(408)
    expect(t.deliveryFee).toBe(30)
    expect(t.packaging).toBe(PACKAGING_FEE)
    expect(t.total).toBe(408 + 30 + PACKAGING_FEE)
  })

  it('charges delivery on big orders too — there is no free threshold', () => {
    const t = orderTotals([{ price: 2000, qty: 1 }], pinKmNorth(5.5))
    expect(t.deliveryFee).toBe(6 * DELIVERY_FEE_PER_KM)
  })

  it('leaves delivery unpriced until there is a pin', () => {
    const t = orderTotals([{ price: 229, qty: 1 }], null)
    expect(t.deliveryFee).toBeNull()
    expect(t.total).toBe(229 + PACKAGING_FEE)
  })

  it('multiplies by quantity', () => {
    expect(orderTotals([{ price: 229, qty: 3 }], pinKmNorth(1)).subtotal).toBe(
      687,
    )
  })

  it('never charges packaging without any items', () => {
    expect(orderTotals([], null).packaging).toBe(0)
  })

  it('produces whole rupees — no floating point cents', () => {
    const t = orderTotals(
      [
        { price: 99, qty: 3 },
        { price: 129, qty: 2 },
      ],
      pinKmNorth(4.2),
    )
    expect(Number.isInteger(t.total)).toBe(true)
    expect(t.subtotal).toBe(555)
  })
})
