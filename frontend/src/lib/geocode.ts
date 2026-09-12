import { BRAND } from '@shared/index'

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

export type PlaceResult = {
  /** Short first line — "Shreeban Residency". */
  title: string
  /** The rest of the address, for disambiguation. */
  detail: string
  lat: number
  lng: number
}

/** Splits Nominatim's one long display_name into a title + the remainder. */
function splitLabel(displayName: string): { title: string; detail: string } {
  const [head, ...tail] = displayName.split(', ')
  return { title: head ?? displayName, detail: tail.join(', ') }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
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

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)

  const body: { display_name: string; lat: string; lon: string }[] = await res.json()

  // Nominatim happily returns the same place several times — a node and the way
  // around it, metres apart, under one address. Deduping on the address text
  // rather than the coordinates is what removes them: the rows a customer
  // cannot tell apart are exactly the rows that read identically.
  const seen = new Set<string>()
  const out: PlaceResult[] = []

  for (const r of body) {
    const key = r.display_name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...splitLabel(r.display_name), lat: Number(r.lat), lng: Number(r.lon) })
  }

  return out
}

/** Turns a dropped pin into something a human can check — "Dahanukar Colony, Kothrud". */
export async function describePoint(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = new URL(`${NOMINATIM}/reverse`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '18')

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null

  const body: { display_name?: string } = await res.json()
  if (!body.display_name) return null

  // The full string runs to the country and postcode; the first few parts are
  // the only ones that help someone confirm the pin.
  return body.display_name.split(', ').slice(0, 3).join(', ')
}

/* --- Distance -------------------------------------------------------------- */

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Straight-line distance in km. Good enough to flag an out-of-range pin. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function kmFromKitchen(pos: { lat: number; lng: number }): number {
  return distanceKm(BRAND.geo, pos)
}

/**
 * Rough delivery window: 20 min in the kitchen plus road time at ~18 km/h,
 * which is what a two-wheeler actually averages across Pune traffic. Rounded
 * to a 10-minute band so it reads as an estimate, not a promise.
 */
export function etaMinutes(km: number): { from: number; to: number } {
  const ride = (km / 18) * 60
  const mid = 20 + ride
  const from = Math.max(20, Math.round((mid - 5) / 5) * 5)
  return { from, to: from + 10 }
}

export function isOutsideDeliveryRange(km: number): boolean {
  return km > BRAND.deliveryRadiusKm
}
