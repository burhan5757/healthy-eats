import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Read-only pin preview for the tracking page's "Delivering to" card.
 * All interaction is disabled — this is a picture of where the rider is headed,
 * not a control.
 */
export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

    L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          width:22px;height:22px;border-radius:50% 50% 50% 0;
          background:var(--he-green);transform:rotate(-45deg);
          border:3px solid var(--he-surface);
          box-shadow:0 3px 8px rgba(19,33,25,.4);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      }),
    }).addTo(map)

    // Same settling problem as the checkout map — re-measure once laid out.
    requestAnimationFrame(() => map.invalidateSize())
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      map.remove()
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Map showing the delivery location"
      className="h-[170px] w-full overflow-hidden rounded-sm border border-border"
    />
  )
}
