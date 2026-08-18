import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed, Loader2, MapPin, Minus, Plus, Search, TriangleAlert } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BRAND } from '@shared/index'
import {
  describePoint,
  etaMinutes,
  isOutsideDeliveryRange,
  kmFromKitchen,
  searchPlaces,
  type PlaceResult,
} from '@/lib/geocode'
import { cn } from '@/lib/utils'

/** The map opens on the kitchen so the customer starts somewhere recognisable. */
const KITCHEN: [number, number] = [BRAND.geo.lat, BRAND.geo.lng]

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:26px;height:26px;border-radius:50% 50% 50% 0;
    background:var(--he-green);transform:rotate(-45deg);
    border:3px solid var(--he-surface);
    box-shadow:0 3px 10px rgba(19,33,25,.45);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

/** The kitchen itself — a quiet reference point, so "4 km away" means something. */
const kitchenIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:12px;height:12px;border-radius:50%;
    background:var(--he-terracotta);border:2px solid var(--he-surface);
    box-shadow:0 1px 4px rgba(19,33,25,.35);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

/**
 * Draggable delivery pin, per the checkout design's "Drop your pin" card.
 *
 * Leaflet + OpenStreetMap tiles — no API key, no billing account. The marker is
 * a plain div so it inherits the brand colour rather than Leaflet's default blue
 * PNG (which also 404s under bundlers).
 *
 * Dragging alone was not enough to actually find an address: the pin now also
 * takes a search, reads back the street it landed on, and says how far that is
 * from the kitchen.
 */
export function PinMap({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null
  onChange: (pos: { lat: number; lng: number }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [label, setLabel] = useState<string | null>(null)
  const [labelLoading, setLabelLoading] = useState(false)
  const skipSearchRef = useRef(false)

  // Keep the latest callback without re-running the map setup effect.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  /**
   * Places (or moves) the pin. The marker is created on first use rather than at
   * mount: until the customer puts it somewhere, there is no delivery point, and
   * showing one parked on the kitchen would send the rider a pin that looks
   * deliberate but points at the restaurant.
   */
  const placePin = useCallback((pos: { lat: number; lng: number }, zoom?: number) => {
    const map = mapRef.current
    if (!map) return

    if (!markerRef.current) {
      const marker = L.marker(pos, { icon: pinIcon, draggable: true, keyboard: true })
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        onChangeRef.current({ lat, lng })
      })
      marker.addTo(map)
      markerRef.current = marker
    } else {
      markerRef.current.setLatLng(pos)
    }

    if (zoom) map.setView(pos, zoom)
    onChangeRef.current(pos)
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: value ? [value.lat, value.lng] : KITCHEN,
      // Wide enough on open to recognise the neighbourhood, not just a rooftop.
      zoom: value ? 17 : 14,
      zoomControl: false,
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    L.marker(KITCHEN, { icon: kitchenIcon, interactive: false, keyboard: false })
      .addTo(map)
      .bindTooltip(BRAND.kitchenLabel, { direction: 'top', offset: [0, -8] })

    if (value) placePin(value)

    // Tapping the map is faster than dragging on a phone.
    map.on('click', (e: L.LeafletMouseEvent) => {
      placePin({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    /**
     * Leaflet measures its container once at init. Inside a grid/flex layout the
     * container is often still settling at that moment, which leaves tiles
     * covering only part of the box. Re-measuring on the next frame and on any
     * subsequent resize keeps the tiles filling the container.
     */
    requestAnimationFrame(() => map.invalidateSize())

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Intentionally runs once — subsequent value changes are driven by this map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --- Search ------------------------------------------------------------- */

  useEffect(() => {
    // Choosing a result writes its name back into the box. Without this guard
    // that write looks like typing, so the dropdown immediately researches and
    // reopens over the map the customer was about to check.
    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return
    }

    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setSearchError(null)
      setSearching(false)
      return
    }

    // Debounced and abortable — Nominatim's public instance is rate limited.
    const controller = new AbortController()
    setSearching(true)

    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then((found) => {
          setResults(found)
          setSearchError(found.length === 0 ? 'No match. Try a landmark, or tap the map.' : null)
          setOpen(true)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setResults([])
          setSearchError('Search is unavailable. Tap the map to place your pin.')
          console.error(err)
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 450)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  /* --- Read the pin back as an address ------------------------------------ */

  useEffect(() => {
    if (!value) {
      setLabel(null)
      setLabelLoading(false)
      return
    }

    const controller = new AbortController()
    setLabelLoading(true)

    const timer = setTimeout(() => {
      describePoint(value.lat, value.lng, controller.signal)
        .then((found) => setLabel(found))
        .catch(() => {
          /* The coordinates below are still shown; a missing label is not an error. */
        })
        .finally(() => {
          if (!controller.signal.aborted) setLabelLoading(false)
        })
    }, 600)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [value])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Your browser cannot share a location.')
      return
    }
    setLocating(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placePin({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 17)
        setLocating(false)
      },
      () => {
        setGeoError('We could not get your location. Search or tap the map instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const chooseResult = (r: PlaceResult) => {
    placePin({ lat: r.lat, lng: r.lng }, 17)
    skipSearchRef.current = true
    setQuery(r.title)
    setOpen(false)
    setResults([])
    setSearchError(null)
  }

  const km = value ? kmFromKitchen(value) : null
  const tooFar = km != null && isOutsideDeliveryRange(km)
  const eta = km != null ? etaMinutes(km) : null

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px]">Drop your pin</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Search your building, or tap the map. Drag the pin to your gate — this is what the
            rider sees.
          </p>
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-full border border-primary/45 px-4 py-2 text-[13px] font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          <LocateFixed className="size-4" strokeWidth={1.75} aria-hidden />
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
      </div>

      {/* --- Search ---------------------------------------------------------- */}
      <div className="relative mt-5">
        <label htmlFor="pin-search" className="eyebrow block text-muted-foreground">
          Find your address
        </label>

        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            id="pin-search"
            type="text"
            value={query}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls="pin-search-results"
            placeholder="Shreeban Residency, Dahanukar Colony"
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            // This input lives inside the checkout form; Enter must not submit it.
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
              if (e.key === 'Escape') setOpen(false)
            }}
            className="w-full rounded-sm border border-border bg-background py-3 pr-11 pl-11 text-[15px] transition-colors duration-200 placeholder:text-muted-foreground/55 focus:border-primary"
          />
          {searching && (
            <Loader2
              className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-hidden
            />
          )}
        </div>

        {open && results.length > 0 && (
          <ul
            id="pin-search-results"
            role="listbox"
            aria-label="Address matches"
            // Above Leaflet's own controls, which sit at z-index 800 and
            // otherwise print the attribution through this list on mobile.
            className="absolute inset-x-0 top-full z-[900] mt-1.5 overflow-hidden rounded-sm border border-border bg-surface shadow-[0_10px_30px_-12px_rgba(19,33,25,0.45)]"
          >
            {results.map((r) => (
              // The address text, which `searchPlaces` has already deduped —
              // coordinates are not unique enough, the same point comes back
              // under more than one name.
              <li key={`${r.title}, ${r.detail}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => chooseResult(r)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-secondary not-last:border-b not-last:border-border"
                >
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-terracotta-text"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{r.title}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {r.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searchError && (
          <p role="status" className="mt-2 text-[13px] text-muted-foreground">
            {searchError}
          </p>
        )}
      </div>

      {geoError && (
        <p role="status" className="mt-3 text-[13px] text-destructive">
          {geoError}
        </p>
      )}

      {/* --- Map ------------------------------------------------------------- */}
      <div className="relative mt-5 overflow-hidden rounded-md border border-border">
        <div ref={containerRef} className="h-[280px] w-full" />

        <span className="pointer-events-none absolute top-3 left-3 z-[500] rounded-full bg-surface/95 px-3 py-1.5 text-[11px] font-semibold shadow-sm">
          {value ? '· Drag to adjust' : '· Tap to place your pin'}
        </span>

        <div className="absolute right-3 bottom-3 z-[500] flex flex-col overflow-hidden rounded-md border border-border bg-surface">
          <MapZoomButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            <Plus className="size-4" strokeWidth={2} />
          </MapZoomButton>
          <MapZoomButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            <Minus className="size-4" strokeWidth={2} />
          </MapZoomButton>
        </div>
      </div>

      {/* --- What the rider will get ----------------------------------------- */}
      <div aria-live="polite" className="mt-3">
        {value ? (
          <>
            <p className="flex items-start gap-2 text-[13px]">
              <MapPin
                className="mt-0.5 size-3.5 shrink-0 text-primary"
                strokeWidth={2}
                aria-hidden
              />
              <span>
                <span className={cn('font-semibold', labelLoading && !label && 'text-muted-foreground')}>
                  {label ?? (labelLoading ? 'Finding the street…' : 'Pin placed')}
                </span>
                <span className="text-muted-foreground">
                  {' · '}
                  {km!.toFixed(1)} km from the kitchen
                  {eta && !tooFar && ` · ETA ${eta.from}–${eta.to} min`}
                </span>
              </span>
            </p>

            {tooFar && (
              <p className="mt-2 flex items-start gap-2 rounded-sm bg-badge/60 p-3 text-[13px] text-terracotta-dark">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>
                  That is outside our usual {BRAND.deliveryRadiusKm} km range. You can still order
                  and we will call to confirm, or move the pin closer.
                </span>
              </p>
            )}

            <p className="mt-2 text-[12px] tabular-nums text-muted-foreground">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No pin yet — the rider will only have the address above to go on.
          </p>
        )}
      </div>
    </div>
  )
}

function MapZoomButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center text-foreground transition-colors duration-150',
        'hover:bg-muted not-last:border-b not-last:border-border',
      )}
    >
      {children}
    </button>
  )
}
