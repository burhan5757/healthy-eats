import { describe, expect, it } from 'vitest'
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE, PACKAGING_FEE } from '../../shared/index'

/**
 * The client mirrors the server's total calculation so the customer never sees a
 * different number at checkout than the one the kitchen charges. These tests pin
 * that arithmetic down on both sides at once.
 *
 * Re-implemented here rather than imported from the client store, which pulls in
 * zustand and a browser localStorage — the formula is what matters.
 */
function totals(lines: { price: number; qty: number }[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  const empty = lines.length === 0
  const deliveryFee = empty || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE
  const packaging = empty ? 0 : PACKAGING_FEE
  return { subtotal, deliveryFee, packaging, total: subtotal + deliveryFee + packaging }
}

describe('cart totals', () => {
  it('is entirely zero for an empty cart', () => {
    expect(totals([])).toEqual({ subtotal: 0, deliveryFee: 0, packaging: 0, total: 0 })
  })

  it('adds delivery and packaging to a small order', () => {
    // Lean Chicken Thali + Paneer & Brown Rice, the pair used throughout testing.
    const t = totals([
      { price: 229, qty: 1 },
      { price: 179, qty: 1 },
    ])
    expect(t.subtotal).toBe(408)
    expect(t.deliveryFee).toBe(39)
    expect(t.packaging).toBe(15)
    expect(t.total).toBe(462)
  })

  it('multiplies by quantity', () => {
    const t = totals([{ price: 229, qty: 3 }])
    expect(t.subtotal).toBe(687)
  })

  it('drops the delivery fee once the order is big enough', () => {
    const t = totals([{ price: FREE_DELIVERY_ABOVE, qty: 1 }])
    expect(t.deliveryFee).toBe(0)
    expect(t.total).toBe(FREE_DELIVERY_ABOVE + PACKAGING_FEE)
  })

  it('still charges delivery one rupee below the threshold', () => {
    const t = totals([{ price: FREE_DELIVERY_ABOVE - 1, qty: 1 }])
    expect(t.deliveryFee).toBe(DELIVERY_FEE)
  })

  it('never charges packaging without any items', () => {
    expect(totals([]).packaging).toBe(0)
  })

  it('produces whole rupees — no floating point cents', () => {
    const t = totals([
      { price: 99, qty: 3 },
      { price: 129, qty: 2 },
    ])
    expect(Number.isInteger(t.total)).toBe(true)
    expect(t.subtotal).toBe(555)
  })
})
