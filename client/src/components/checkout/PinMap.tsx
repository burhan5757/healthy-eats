import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

/** Kitchen location — Kothrud, Pune. The map opens here. */
const KITCHEN: [number, number] = [18.5089, 73.8088]

/**
 * Draggable delivery pin, per the checkout design's "Drop your pin" card.
 *
 * Uses Leaflet with OpenStreetMap tiles — no API key, no billing account.
 * The marker is a plain div so it inherits the brand colour rather than
 * Leaflet's default blue PNG (which also 404s under bundlers).
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

  // Keep the latest callback without re-running the map setup effect.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const start: [number, number] = value ? [value.lat, value.lng] : KITCHEN

    const map = L.map(containerRef.current, {
      center: start,
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:26px;height:26px;border-radius:50% 50% 50% 0;
        background:var(--he-green);transform:rotate(-45deg);
        border:3px solid var(--he-surface);
        box-shadow:0 3px 10px rgba(19,33,25,.45);"></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    })

    const marker = L.marker(start, { icon, draggable: true }).addTo(map)
    markerRef.current = marker

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      onChangeRef.current({ lat, lng })
    })

    // Tapping the map is faster than dragging on a phone.
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    if (!value) onChangeRef.current({ lat: KITCHEN[0], lng: KITCHEN[1] })

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

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Your browser cannot share a location.')
      return
    }
    setLocating(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapRef.current?.setView([next.lat, next.lng], 17)
        markerRef.current?.setLatLng([next.lat, next.lng])
        onChangeRef.current(next)
        setLocating(false)
      },
      () => {
        setGeoError('We could not get your location. Drag the pin instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px]">Drop your pin</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Drag the pin to your gate. This is what the rider sees.
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

      {geoError && (
        <p role="status" className="mt-3 text-[13px] text-destructive">
          {geoError}
        </p>
      )}

      <div className="relative mt-5 overflow-hidden rounded-md border border-border">
        <div ref={containerRef} className="h-[280px] w-full" />

        <span className="pointer-events-none absolute top-3 left-3 z-[500] rounded-full bg-surface/95 px-3 py-1.5 text-[11px] font-semibold shadow-sm">
          · Drag to adjust
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

      {value && (
        <p className="mt-3 text-[12px] tabular-nums text-muted-foreground">
          {value.lat.toFixed(4)}, {value.lng.toFixed(4)} · rider ETA 35–45 min
        </p>
      )}
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
