import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MapPin, Phone } from 'lucide-react'
import { BRAND, SOCKET_EVENTS } from '@shared/index'
import { MiniMap } from '@/components/track/MiniMap'
import { api, ApiError } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useAuth } from '@/store/auth'
import { cn, formatINR } from '@/lib/utils'

/**
 * The driver's screen. Operational only (CLAUDE.md §7): the orders assigned to
 * this driver and one live button per order — Accept, then Mark delivered.
 * No counts, no earnings, no history. Built for a phone held outdoors.
 */
export default function Driver() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const { data, isPending, isError } = useQuery({
    queryKey: ['driver'],
    queryFn: api.orders.driverQueue,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const socket = getSocket()
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ['driver'] })
    socket.on(SOCKET_EVENTS.orderUpdated, refresh)
    return () => socket.off(SOCKET_EVENTS.orderUpdated, refresh)
  }, [queryClient])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['driver'] })
  const accept = useMutation({
    mutationFn: api.orders.driverAccept,
    onSettled: refresh,
  })
  const deliver = useMutation({
    mutationFn: api.orders.deliver,
    onSettled: refresh,
  })

  const signOut = async () => {
    await logout()
    navigate('/driver/login')
  }

  const orders = data?.orders ?? []
  const failure = accept.error ?? deliver.error

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-[20px] leading-tight">
              {BRAND.name}
            </p>
            <p className="eyebrow truncate text-muted-foreground">
              Deliveries · {user?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-primary/60"
          >
            <LogOut className="size-3.5" strokeWidth={1.5} aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] px-4 py-6">
        <h1 className="text-[28px]">Your deliveries</h1>

        {failure && (
          <p
            role="alert"
            className="mt-4 rounded-sm bg-destructive/10 p-3 text-[14px] text-destructive"
          >
            {failure instanceof ApiError
              ? failure.message
              : 'Something went wrong. Try again.'}
          </p>
        )}

        {isPending ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="mt-10 text-destructive">
            Could not load your deliveries. Check your connection.
          </p>
        ) : orders.length === 0 ? (
          <div className="mt-6 rounded-md border border-border bg-surface px-6 py-16 text-center">
            <h2 className="font-display text-[22px]">Nothing assigned</h2>
            <p className="mx-auto mt-2 max-w-[34ch] text-[15px] text-muted-foreground">
              New deliveries appear here as soon as the kitchen assigns them to
              you.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-5">
            {orders.map((order) => (
              <li key={order.id}>
                <DeliveryCard
                  order={order}
                  busy={
                    (accept.isPending && accept.variables === order.id) ||
                    (deliver.isPending && deliver.variables === order.id)
                  }
                  onAccept={() => accept.mutate(order.id)}
                  onDeliver={() => deliver.mutate(order.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function DeliveryCard({ order, busy, onAccept, onDeliver }) {
  const [confirming, setConfirming] = useState(false)
  const accepted = Boolean(order.driver?.acceptedAt)
  const { address } = order
  const hasPin = address.lat != null && address.lng != null
  // No pin (the customer never tapped the map) → search the written address.
  const destination = hasPin
    ? `${address.lat},${address.lng}`
    : [address.line1, address.landmark, `${BRAND.city} ${address.pincode}`]
        .filter(Boolean)
        .join(', ')
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`

  return (
    <article
      className={cn(
        'overflow-hidden rounded-md border border-l-4 border-border bg-surface',
        accepted ? 'border-l-primary' : 'border-l-terracotta',
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[24px] whitespace-nowrap tabular-nums">
            {order.orderNumber}
          </p>
          <span
            className={cn(
              'eyebrow rounded-sm px-2 py-1',
              accepted
                ? 'bg-primary/12 text-primary'
                : 'bg-badge text-terracotta-dark',
            )}
          >
            {accepted ? 'Out for delivery' : 'New'}
          </span>
        </div>

        <p className="selectable mt-4 text-[17px] font-semibold">
          {address.name}
        </p>
        <p className="selectable mt-1 text-[15px] leading-relaxed">
          {address.line1}
          {address.landmark ? `, ${address.landmark}` : ''} · {address.pincode}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`tel:+91${address.phone}`}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[14px] font-semibold transition-colors hover:border-primary/60"
          >
            <Phone className="size-4" strokeWidth={1.75} aria-hidden />
            Call +91 {address.phone}
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[14px] font-semibold transition-colors hover:border-primary/60"
          >
            <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
            {hasPin ? 'Open in Maps' : 'Find address in Maps'}
          </a>
        </div>

        {hasPin ? (
          <div className="mt-4 overflow-hidden rounded-sm">
            <MiniMap lat={address.lat} lng={address.lng} />
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-muted-foreground">
            No map pin on this order — directions use the written address. Call
            the customer if it&apos;s unclear.
          </p>
        )}

        <ul className="mt-5 space-y-1.5 border-t border-border pt-4">
          {order.items.map((item) => (
            <li key={item.dishId} className="flex gap-3 text-[14px]">
              <span className="text-muted-foreground tabular-nums">
                {item.qty} ×
              </span>
              <span>{item.name}</span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 rounded-sm bg-badge/60 px-3 py-2 text-[13px] text-terracotta-dark">
            {order.notes}
          </p>
        )}

        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="eyebrow text-muted-foreground">Collect cash</span>
          <span className="font-display text-[24px] tabular-nums">
            {formatINR(order.total)}
          </span>
        </div>
      </div>

      <div className="border-t border-border p-4">
        {!accepted ? (
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="w-full rounded-full bg-primary py-4 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {busy ? 'Accepting…' : 'Accept delivery'}
          </button>
        ) : confirming ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="flex-1 rounded-full border border-border py-4 text-[16px] font-semibold transition-colors hover:border-primary/60"
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={onDeliver}
              disabled={busy}
              className="flex-[2] rounded-full bg-primary py-4 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {busy ? 'Saving…' : `Cash ${formatINR(order.total)} collected`}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full rounded-full bg-primary py-4 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            Mark delivered
          </button>
        )}
      </div>
    </article>
  )
}
