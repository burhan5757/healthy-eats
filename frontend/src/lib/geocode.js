import { BRAND, MAX_DELIVERY_KM, distanceKm } from '@shared/index'

/**
 * Geocoding for the checkout pin, via OpenStreetMap's Nominatim — the same
 * OSM family as the map tiles, so there is still no API key and no billing
 * account (CLAUDE.md decision, 2026-08-14).
 *
 * Components never call fetch directly (CLAUDE.md §6 principle 2), so both
 * requests live here alongside `api.ts` and `socket.ts`.
 *
 * ⚠️ Nominatim's public instance allows roughly one request per second and asks
 * for an identifying referer. Every call site here is debounced and abortable
 * to stay inside that. Before real traffic, move to a self-hosted Nominatim or
 * a paid geocoder — the public endpoint is not for production volume.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** Bias results to greater Pune so "Sunrise Heights" doesn't land in Delhi. */
const PUNE_VIEWBOX = '73.62,18.65,74.02,18.36'

/** Splits Nominatim's one long display_name into a title + the remainder. */
function splitLabel(displayName) {
  const [head, ...tail] = displayName.split(', ')
  return { title: head ?? displayName, detail: tail.join(', ') }
}

export async function searchPlaces(query, signal) {
  const url = new URL(`${NOMINATIM}/search`)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'in')
  url.searchParams.set('viewbox', PUNE_VIEWBOX)
  // Soft bias, not a hard cut — someone ordering to a Pune fringe address still
  // wants to find it, they just want the local match ranked first.
  url.searchParams.set('bounded', '0')

  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)

  const body = await res.json()

  // Nominatim happily returns the same place several times — a node and the way
  // around it, metres apart, under one address. Deduping on the address text
  // rather than the coordinates is what removes them: the rows a customer
  // cannot tell apart are exactly the rows that read identically.
  const seen = new Set()
  const out = []

  for (const r of body) {
    const key = r.display_name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      ...splitLabel(r.display_name),
      lat: Number(r.lat),
      lng: Number(r.lon),
    })
  }

  return out
}

/**
 * Turns a dropped pin into something a human can check — "Dahanukar Colony,
 * Kothrud" — plus the postcode, which pre-fills checkout's pincode field.
 */
export async function describePoint(lat, lng, signal) {
  const url = new URL(`${NOMINATIM}/reverse`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null

  const body = await res.json()
  if (!body.display_name) return null

  // The full string runs to the country and postcode; the first few parts are
  // the only ones that help someone confirm the pin.
  const postcode = String(body.address?.postcode ?? '').replace(/\s/g, '')
  return {
    label: body.display_name.split(', ').slice(0, 3).join(', '),
    postcode: /^\d{6}$/.test(postcode) ? postcode : null,
  }
}

/* --- Distance -------------------------------------------------------------- */

export function kmFromKitchen(pos) {
  return distanceKm(BRAND.geo, pos)
}

/**
 * Rough delivery window: 20 min in the kitchen plus road time at ~18 km/h,
 * which is what a two-wheeler actually averages across Pune traffic. Rounded
 * to a 10-minute band so it reads as an estimate, not a promise.
 */
export function etaMinutes(km) {
  const ride = (km / 18) * 60
  const mid = 20 + ride
  const from = Math.max(20, Math.round((mid - 5) / 5) * 5)
  return { from, to: from + 10 }
}

export function isOutsideDeliveryRange(km) {
  return km > BRAND.deliveryRadiusKm
}

/** Past this, the order is refused outright (the server checks it too). */
export function isBeyondDeliveryLimit(km) {
  return km > MAX_DELIVERY_KM
}
