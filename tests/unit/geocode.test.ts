import { describe, expect, it } from 'vitest'
import { BRAND } from '../../shared/index'
import {
  distanceKm,
  etaMinutes,
  isOutsideDeliveryRange,
  kmFromKitchen,
} from '../../client/src/lib/geocode'

/**
 * The checkout pin decides what the rider is told and whether an address is
 * flagged as out of range, so the arithmetic behind it is worth pinning down.
 * Only the pure functions are covered — the Nominatim calls are network I/O.
 */

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(BRAND.geo, BRAND.geo)).toBe(0)
  })

  it('measures a known Pune hop within a few hundred metres', () => {
    // Kothrud kitchen → Viman Nagar, a delivery area, is about 15 km by air.
    const vimanNagar = { lat: 18.5679, lng: 73.9143 }
    expect(distanceKm(BRAND.geo, vimanNagar)).toBeGreaterThan(13)
    expect(distanceKm(BRAND.geo, vimanNagar)).toBeLessThan(16)
  })

  it('is symmetric', () => {
    const a = { lat: 18.51, lng: 73.81 }
    const b = { lat: 18.62, lng: 73.74 }
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10)
  })

  it('kmFromKitchen measures from the brand address', () => {
    const somewhere = { lat: 18.6, lng: 73.9 }
    expect(kmFromKitchen(somewhere)).toBeCloseTo(distanceKm(BRAND.geo, somewhere), 10)
  })
})

describe('delivery range', () => {
  it('accepts a pin on the kitchen', () => {
    expect(isOutsideDeliveryRange(0)).toBe(false)
  })

  it('accepts the radius exactly', () => {
    expect(isOutsideDeliveryRange(BRAND.deliveryRadiusKm)).toBe(false)
  })

  it('flags anything beyond it', () => {
    expect(isOutsideDeliveryRange(BRAND.deliveryRadiusKm + 0.1)).toBe(true)
  })

  it('flags Talegaon, which is not a delivery area', () => {
    // ~35 km out — the town on the kitchen's printed menu poster (CLAUDE.md §8b).
    expect(isOutsideDeliveryRange(kmFromKitchen({ lat: 18.7353, lng: 73.6759 }))).toBe(true)
  })
})

describe('etaMinutes', () => {
  it('never promises less than the time the food takes to cook', () => {
    expect(etaMinutes(0).from).toBeGreaterThanOrEqual(20)
  })

  it('grows with distance', () => {
    expect(etaMinutes(10).from).toBeGreaterThan(etaMinutes(1).from)
  })

  it('always returns a 10-minute window', () => {
    for (const km of [0, 1, 4.5, 12, 30]) {
      const { from, to } = etaMinutes(km)
      expect(to - from).toBe(10)
    }
  })
})
