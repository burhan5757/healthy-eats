import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleX, Phone } from 'lucide-react'
import { BRAND, PREP_TIME_MINUTES, SOCKET_EVENTS,            } from '@shared/index'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { Container } from '@/components/ui/primitives'
import { StatusTrack } from '@/components/track/StatusTrack'
import { MiniMap } from '@/components/track/MiniMap'
import { formatINR } from '@/lib/utils'

export default function Track() {
  const { orderNumber = '' } = useParams()
  const queryClient = useQueryClient()

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.orders.track(orderNumber),
    enabled: Boolean(orderNumber),
  })

  // Live updates: the kitchen accepting or finishing this order pushes straight
  // to this page, so the customer never has to refresh.
  useEffect(() => {
    const socket = getSocket()
    const refresh = ({ order }                  ) => {
      if (order.orderNumber === orderNumber) {
        queryClient.setQueryData(['order', orderNumber], { order })
      }
    }
    socket.on(SOCKET_EVENTS.orderUpdated, refresh)
    return () => {
      socket.off(SOCKET_EVENTS.orderUpdated, refresh)
    }
  }, [orderNumber, queryClient])

  if (isPending) return <Shell><p className="text-muted-foreground">Finding your order…</p></Shell>
  if (isError) return <NotFound message={(error         ).message} />

  const order = data.order
  const cancelled = order.status === 'cancelled'

  return (
    <Shell>
      {cancelled ? <CancelledView order={order} /> : <LiveView order={order} />}
    </Shell>
  )
}

/* ---------------------------------------------------------------- live ---- */

function LiveView({ order }                  ) {
  const placedAt = new Date(order.timeline[0]?.at ?? order.createdAt)
  const eta = new Date(placedAt.getTime() + PREP_TIME_MINUTES * 60000 + 15 * 60000)
  const etaEnd = new Date(eta.getTime() + 15 * 60000)
  const hhmm = (d      ) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const minsAway = Math.max(0, Math.round((eta.getTime() - Date.now()) / 60000))

  const accepted = order.timeline.find((t) => t.status === 'preparing')

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="grid gap-8 p-8 lg:grid-cols-[1fr_minmax(0,320px)]">
        <div>
          <p className="eyebrow text-muted-foreground">Order received · keep this number</p>
          <p className="mt-3 font-display text-[clamp(2.75rem,7vw,4rem)] leading-none tabular-nums">
            {order.orderNumber}
          </p>
          <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground">
            No account needed — bookmark this page or type the order number on the site to see
            where your food is.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-sm bg-badge/60 p-5">
            <p className="eyebrow text-terracotta-dark">Estimated delivery</p>
            <p className="mt-2">
              <span className="font-display text-[30px] tabular-nums">{hhmm(eta)}</span>
              <span className="ml-2 text-[13px] text-muted-foreground">
                – {hhmm(etaEnd)} · in about {minsAway} min
              </span>
            </p>
          </div>

          {accepted && (
            <div className="flex items-center gap-2.5 rounded-sm bg-primary/8 p-4">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <p className="text-[13px] text-foreground">
                Accepted at{' '}
                {new Date(accepted.at).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                — the kitchen is cooking your order
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-8">
        <StatusTrack order={order} />
      </div>

      <div className="grid border-t border-border lg:grid-cols-2">
        <section className="p-8">
          <h2 className="font-display text-[24px]">Your order</h2>

          <ul className="mt-6 divide-y divide-border border-t border-border">
            {order.items.map((item) => (
              <li key={item.dishId} className="flex justify-between gap-4 py-3.5 text-[14px]">
                <span>
                  {item.name} <span className="text-muted-foreground">× {item.qty}</span>
                </span>
                <span className="tabular-nums">{formatINR(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular-nums">
                {order.deliveryFee === 0 ? 'Free' : formatINR(order.deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Packaging</dt>
              <dd className="tabular-nums">{formatINR(order.packaging)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-sm bg-forest px-6 py-5">
            <span className="eyebrow text-on-dark-muted">Cash to pay on delivery</span>
            <span className="font-display text-[26px] tabular-nums text-on-dark">
              {formatINR(order.total)}
            </span>
          </div>

          <p className="mt-3 text-[12px] text-muted-foreground">
            Exact change helps the rider. Ask for the printed bill in the bag.
          </p>
        </section>

        <section className="border-t border-border p-8 lg:border-t-0 lg:border-l">
          <h2 className="font-display text-[24px]">Delivering to</h2>

          {order.address.lat != null && order.address.lng != null && (
            <div className="mt-6">
              <MiniMap lat={order.address.lat} lng={order.address.lng} />
            </div>
          )}

          <address className="mt-6 space-y-1 text-[14px] not-italic">
            <p className="font-semibold">{order.address.name}</p>
            <p className="text-muted-foreground">{order.address.line1}</p>
            <p className="text-muted-foreground">Pune {order.address.pincode}</p>
            {order.address.landmark && (
              <p className="text-terracotta-text">Landmark: {order.address.landmark}</p>
            )}
          </address>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 rounded-full border border-primary/45 px-5 py-2.5 text-[13px] font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
            >
              <Phone className="size-3.5" strokeWidth={1.75} aria-hidden />
              Call the kitchen
            </a>
            <Link
              to="/menu"
              className="rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold transition-colors duration-200 hover:border-primary/60"
            >
              Order again
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- cancelled ---- */

function CancelledView({ order }                  ) {
  const at = order.timeline.find((t) => t.status === 'cancelled')

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-destructive px-7 py-4">
        <p className="flex items-center gap-2.5 text-[14px] font-semibold text-destructive-foreground">
          <CircleX className="size-4" strokeWidth={2} aria-hidden />
          Order unavailable — the kitchen couldn&apos;t take this order
        </p>
        <p className="text-[13px] text-destructive-foreground/85 tabular-nums">
          {order.orderNumber}
          {at &&
            ` · ${new Date(at.at).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
        </p>
      </div>

      <div className="grid gap-8 p-8 lg:grid-cols-[1fr_minmax(0,320px)]">
        <div>
          <p className="eyebrow text-muted-foreground">Order number</p>
          <p className="mt-3 font-display text-[clamp(2.5rem,6vw,3.5rem)] leading-none tabular-nums">
            {order.orderNumber}
          </p>
          <p className="mt-5 max-w-[48ch] text-[14px] leading-relaxed text-muted-foreground">
            Nothing was charged — there&apos;s nothing to refund because payment is cash on
            delivery.
          </p>
        </div>

        <div className="space-y-4">
          {order.cancellation?.reason && (
            <div className="rounded-sm bg-badge/60 p-5">
              <p className="eyebrow text-terracotta-dark">Reason from the kitchen</p>
              <p className="mt-2 text-[14px]">{order.cancellation.reason}</p>
            </div>
          )}

          <Link
            to="/menu"
            className="block rounded-full bg-primary px-8 py-4 text-center text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
          >
            Browse menu again
          </Link>
        </div>
      </div>

      <div className="border-t border-border p-8">
        <StatusTrack order={order} />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- shell ---- */

function Shell({ children }                               ) {
  return (
    <div className="pb-24">
      <div className="border-b border-border">
        <Container className="flex h-[64px] items-center justify-between gap-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-[21px] leading-none">{BRAND.name}</span>
            <span className="eyebrow text-muted-foreground">{BRAND.city}</span>
          </Link>
          <p className="text-[13px] text-muted-foreground">
            Kitchen:{' '}
            <a
              href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
              className="text-terracotta-text transition-opacity hover:opacity-80"
            >
              {BRAND.phone}
            </a>
          </p>
        </Container>
      </div>

      <Container className="pt-10">{children}</Container>
    </div>
  )
}

function NotFound({ message }                     ) {
  return (
    <Shell>
      <div className="rounded-md border border-border bg-surface px-8 py-24 text-center">
        <h1 className="font-display text-[30px]">We can&apos;t find that order</h1>
        <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
          {message}
        </p>
        <Link
          to="/menu"
          className="mt-9 inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
        >
          Browse the menu
        </Link>
      </div>
    </Shell>
  )
}
