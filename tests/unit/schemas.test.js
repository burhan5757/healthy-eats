import { describe, expect, it } from 'vitest'
import {
  BRAND,
  DELIVERY_FEE_PER_KM,
  GOALS,
  GOAL_LABELS,
  PACKAGING_FEE,
  PAYMENT_STATUS_LABELS,
  addressSchema,
  assignDriverSchema,
  cancelOrderSchema,
  createDriverSchema,
  deliveryFeeFor,
  isNonVeg,
  paymentSchema,
  placeOrderSchema,
  updateDriverSchema,
} from '../../backend/src/shared/index.js'

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

  it.each([
    ['5 digits', '41103'],
    ['letters', 'abc123'],
    ['7 digits', '4110380'],
  ])('rejects a pincode with %s', (_why, pincode) => {
    expect(addressSchema.safeParse({ ...valid, pincode }).success).toBe(false)
  })

  it('rejects an empty name and a stub address', () => {
    expect(addressSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...valid, line1: 'abc' }).success).toBe(
      false,
    )
  })

  it('carries the dropped map pin through', () => {
    const result = addressSchema.safeParse({
      ...valid,
      lat: 18.5089,
      lng: 73.8088,
    })
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
  const pinned = { ...address, lat: 18.559, lng: 73.786 }

  it('requires a map pin, because delivery is priced by distance', () => {
    const result = placeOrderSchema.safeParse({
      items: [{ dishId: 'a', qty: 1 }],
      address,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/drop a pin/i)
    }
  })

  it('rejects an impossible pin', () => {
    expect(
      placeOrderSchema.safeParse({
        items: [{ dishId: 'a', qty: 1 }],
        address: { ...address, lat: 123, lng: 73.8 },
      }).success,
    ).toBe(false)
  })

  it('rejects an empty cart', () => {
    const result = placeOrderSchema.safeParse({ items: [], address: pinned })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/cart is empty/i)
    }
  })

  it('rejects a zero or negative quantity', () => {
    expect(
      placeOrderSchema.safeParse({
        items: [{ dishId: 'a', qty: 0 }],
        address: pinned,
      }).success,
    ).toBe(false)
    expect(
      placeOrderSchema.safeParse({
        items: [{ dishId: 'a', qty: -2 }],
        address: pinned,
      }).success,
    ).toBe(false)
  })

  it('rejects a fractional quantity', () => {
    expect(
      placeOrderSchema.safeParse({
        items: [{ dishId: 'a', qty: 1.5 }],
        address: pinned,
      }).success,
    ).toBe(false)
  })

  it('defaults the kitchen note to empty and caps its length', () => {
    const ok = placeOrderSchema.safeParse({
      items: [{ dishId: 'a', qty: 1 }],
      address: pinned,
    })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.notes).toBe('')

    const tooLong = placeOrderSchema.safeParse({
      items: [{ dishId: 'a', qty: 1 }],
      address: pinned,
      notes: 'x'.repeat(201),
    })
    expect(tooLong.success).toBe(false)
  })

  it('does NOT accept a price from the client', () => {
    // Totals are recomputed server-side; a price in the payload must be ignored,
    // never trusted. Parsing strips it.
    const result = placeOrderSchema.safeParse({
      items: [{ dishId: 'a', qty: 1, price: 1 }],
      address: pinned,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items[0]).not.toHaveProperty('price')
    }
  })
})

describe('cancel payload', () => {
  it('requires a reason the customer can read', () => {
    expect(
      cancelOrderSchema.safeParse({ reason: '', soldOutDishIds: [] }).success,
    ).toBe(false)
  })

  it('allows rejecting an order without marking anything sold out', () => {
    const result = cancelOrderSchema.safeParse({
      reason: 'Kitchen at capacity',
    })
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
  it('keeps the packaging figure from the checkout design', () => {
    expect(PACKAGING_FEE).toBe(15)
  })

  it('charges ₹10 for every started km from the kitchen', () => {
    expect(DELIVERY_FEE_PER_KM).toBe(10)
    const north = (km) => ({
      lat: BRAND.geo.lat + km * 0.009,
      lng: BRAND.geo.lng,
    })
    expect(deliveryFeeFor(north(0.4))).toBe(10)
    expect(deliveryFeeFor(north(1.05))).toBe(20)
    expect(deliveryFeeFor(north(6.6))).toBe(70)
  })

  it('charges the one-km minimum for a pin at the kitchen door', () => {
    expect(deliveryFeeFor(BRAND.geo)).toBe(10)
  })
})

/**
 * COD ledger — CLAUDE.md §3 is cash on delivery only, so `method` is a
 * single-value enum and there is deliberately no gateway/transaction field.
 */
describe('payment schema', () => {
  const base = { method: 'cod', status: 'pending', amount: 349 }

  it('accepts a pending COD payment', () => {
    expect(paymentSchema.safeParse(base).success).toBe(true)
  })

  it('accepts collected and void, each with their timestamp', () => {
    expect(
      paymentSchema.safeParse({
        ...base,
        status: 'collected',
        collectedAt: new Date().toISOString(),
      }).success,
    ).toBe(true)
    expect(
      paymentSchema.safeParse({
        ...base,
        status: 'void',
        voidedAt: new Date().toISOString(),
      }).success,
    ).toBe(true)
  })

  it('rejects a method other than cod', () => {
    expect(paymentSchema.safeParse({ ...base, method: 'card' }).success).toBe(
      false,
    )
  })

  it('rejects a negative amount', () => {
    expect(paymentSchema.safeParse({ ...base, amount: -1 }).success).toBe(false)
  })

  it('labels every status', () => {
    for (const status of ['pending', 'collected', 'void']) {
      expect(PAYMENT_STATUS_LABELS[status]).toBeTruthy()
    }
  })
})

/** Driver assignment and account management — admin-only surfaces. */
describe('assign driver payload', () => {
  it('accepts a driver id', () => {
    expect(assignDriverSchema.safeParse({ driverId: 'abc123' }).success).toBe(
      true,
    )
  })

  it('accepts null, which unassigns', () => {
    const result = assignDriverSchema.safeParse({ driverId: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.driverId).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(assignDriverSchema.safeParse({ driverId: '' }).success).toBe(false)
  })
})

describe('create driver payload', () => {
  const valid = {
    name: 'Ganesh Pawar',
    phone: '9823011284',
    email: 'ganesh@example.com',
    password: 'roadwork1',
  }

  it('accepts a complete driver signup', () => {
    expect(createDriverSchema.safeParse(valid).success).toBe(true)
  })

  it('reuses the address phone format', () => {
    expect(
      createDriverSchema.safeParse({ ...valid, phone: '123' }).success,
    ).toBe(false)
  })

  it('rejects a short password', () => {
    expect(
      createDriverSchema.safeParse({ ...valid, password: 'short1' }).success,
    ).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(
      createDriverSchema.safeParse({ ...valid, email: 'not-an-email' }).success,
    ).toBe(false)
  })
})

describe('update driver payload', () => {
  it('requires a boolean active flag', () => {
    expect(updateDriverSchema.safeParse({ active: false }).success).toBe(true)
    expect(updateDriverSchema.safeParse({ active: 'false' }).success).toBe(
      false,
    )
    expect(updateDriverSchema.safeParse({}).success).toBe(false)
  })
})
