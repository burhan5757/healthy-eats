import { describe, expect, it } from 'vitest'
import {
  DELIVERY_FEE,
  GOALS,
  GOAL_LABELS,
  PACKAGING_FEE,
  addressSchema,
  cancelOrderSchema,
  isNonVeg,
  placeOrderSchema,
} from '../../shared/index'

/**
 * These schemas validate on BOTH sides — the checkout form and the API. Testing
 * them once covers both, and proves the two can't disagree.
 */
describe('address validation', () => {
  const valid = {
    name: 'Ananya Deshpande',
    phone: '9823011284',
    line1: 'Flat 402, Shreeban Residency, Dahanukar Colony',
    landmark: 'Opposite Kothrud Bus Depot',
    pincode: '411038',
  }

  it('accepts a complete Pune address', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true)
  })

  it('treats the landmark as optional', () => {
    const { landmark: _l, ...withoutLandmark } = valid
    const result = addressSchema.safeParse(withoutLandmark)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.landmark).toBe('')
  })

  it.each([
    ['too short', '98230112'],
    ['too long', '98230112845'],
    ['starts with 5 — not a mobile prefix', '5823011284'],
    ['contains letters', '98230abcde'],
    ['has +91 prefix', '+919823011284'],
  ])('rejects a phone that is %s', (_why, phone) => {
    expect(addressSchema.safeParse({ ...valid, phone }).success).toBe(false)
  })

  it.each([['5 digits', '41103'], ['letters', 'abc123'], ['7 digits', '4110380']])(
    'rejects a pincode with %s',
    (_why, pincode) => {
      expect(addressSchema.safeParse({ ...valid, pincode }).success).toBe(false)
    },
  )

  it('rejects an empty name and a stub address', () => {
    expect(addressSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...valid, line1: 'abc' }).success).toBe(false)
  })

  it('carries the dropped map pin through', () => {
    const result = addressSchema.safeParse({ ...valid, lat: 18.5089, lng: 73.8088 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.lat).toBeCloseTo(18.5089)
  })
})

describe('place order payload', () => {
  const address = {
    name: 'Rohit Kulkarni',
    phone: '9860422190',
    line1: 'Flat 12, Sunrise Heights, Baner Road',
    pincode: '411045',
  }

  it('rejects an empty cart', () => {
    const result = placeOrderSchema.safeParse({ items: [], address })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/cart is empty/i)
    }
  })

  it('rejects a zero or negative quantity', () => {
    expect(
      placeOrderSchema.safeParse({ items: [{ dishId: 'a', qty: 0 }], address }).success,
    ).toBe(false)
    expect(
      placeOrderSchema.safeParse({ items: [{ dishId: 'a', qty: -2 }], address }).success,
    ).toBe(false)
  })

  it('rejects a fractional quantity', () => {
    expect(
      placeOrderSchema.safeParse({ items: [{ dishId: 'a', qty: 1.5 }], address }).success,
    ).toBe(false)
  })

  it('defaults the kitchen note to empty and caps its length', () => {
    const ok = placeOrderSchema.safeParse({ items: [{ dishId: 'a', qty: 1 }], address })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.notes).toBe('')

    const tooLong = placeOrderSchema.safeParse({
      items: [{ dishId: 'a', qty: 1 }],
      address,
      notes: 'x'.repeat(201),
    })
    expect(tooLong.success).toBe(false)
  })

  it('does NOT accept a price from the client', () => {
    // Totals are recomputed server-side; a price in the payload must be ignored,
    // never trusted. Parsing strips it.
    const result = placeOrderSchema.safeParse({
      items: [{ dishId: 'a', qty: 1, price: 1 }],
      address,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items[0]).not.toHaveProperty('price')
    }
  })
})

describe('cancel payload', () => {
  it('requires a reason the customer can read', () => {
    expect(cancelOrderSchema.safeParse({ reason: '', soldOutDishIds: [] }).success).toBe(false)
  })

  it('allows rejecting an order without marking anything sold out', () => {
    const result = cancelOrderSchema.safeParse({ reason: 'Kitchen at capacity' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.soldOutDishIds).toEqual([])
  })
})

describe('taxonomy', () => {
  it('labels every goal', () => {
    for (const goal of GOALS) {
      expect(GOAL_LABELS[goal]).toBeTruthy()
    }
  })

  it('uses the goal names from the design', () => {
    expect([...GOALS]).toEqual(['fat-loss', 'muscle-gain', 'basic-fitness'])
  })

  it('flags non-veg dishes for the veg mark', () => {
    expect(isNonVeg(['non-veg'])).toBe(true)
    expect(isNonVeg(['non-veg', 'gluten-free'])).toBe(true)
    expect(isNonVeg(['veg'])).toBe(false)
    expect(isNonVeg(['vegan', 'gluten-free'])).toBe(false)
    expect(isNonVeg([])).toBe(false)
  })
})

describe('fees', () => {
  it('matches the figures printed in the checkout design', () => {
    expect(DELIVERY_FEE).toBe(39)
    expect(PACKAGING_FEE).toBe(15)
  })
})
