import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ORDER_STATUS_LABELS, SOCKET_EVENTS,                              } from '@shared/index'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { CancelDialog } from '@/components/admin/CancelDialog'
import { MiniMap } from '@/components/track/MiniMap'
import { cn, formatINR } from '@/lib/utils'

;                                           

const STATUS_STYLES                                                         = {
  placed: { badge: 'bg-badge text-terracotta-dark', border: 'border-l-terracotta' },
  preparing: { badge: 'bg-primary/12 text-primary', border: 'border-l-primary' },
  ready: { badge: 'bg-primary/12 text-primary', border: 'border-l-primary' },
  delivered: { badge: 'bg-muted text-muted-foreground', border: 'border-l-border' },
  cancelled: { badge: 'bg-destructive/12 text-destructive', border: 'border-l-destructive' },
}

const BADGE_LABELS                              = {
  ...ORDER_STATUS_LABELS,
  preparing: 'Accepted',
  ready: 'Ready to go',
}

export default function LiveOrders() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState        ('all')
  const [cancelling, setCancelling] = useState              (null)
  const [now, setNow] = useState(() => Date.now())

  const { data, isPending } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: api.orders.all,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    socket.on(SOCKET_EVENTS.orderCreated, refresh)
    socket.on(SOCKET_EVENTS.orderUpdated, refresh)
    return () => {
      socket.off(SOCKET_EVENTS.orderCreated, refresh)
      socket.off(SOCKET_EVENTS.orderUpdated, refresh)
    }
  }, [queryClient])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    queryClient.invalidateQueries({ queryKey: ['menu'] })
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
  }

  const accept = useMutation({ mutationFn: api.orders.accept, onSuccess: invalidateAll })
  const deliver = useMutation({ mutationFn: api.orders.deliver, onSuccess: invalidateAll })
  const cancel = useMutation({
    mutationFn: ({ id, input }                                                                     ) =>
      api.orders.cancel(id, input),
    onSuccess: () => {
      invalidateAll()
      setCancelling(null)
    },
  })

  const orders = useMemo(() => data?.orders ?? [], [data])

  const counts = useMemo(
    () => ({
      all: orders.length,
      placed: orders.filter((o) => o.status === 'placed').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      closed: orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled').length,
    }),
    [orders],
  )

  const visible = orders.filter((o) => {
    if (filter === 'all') return true
    if (filter === 'closed') return o.status === 'delivered' || o.status === 'cancelled'
    return o.status === filter
  })

  const inService = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled',
  ).length

  return (
    <>
      <p className="eyebrow text-muted-foreground">
        {new Date(now).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}{' '}
        · {new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·
        Service open
      </p>

      <h1 className="mt-4 text-[clamp(2rem,4vw,2.75rem)]">Order monitoring</h1>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="eyebrow text-muted-foreground">
          {inService} {inService === 1 ? 'order' : 'orders'} in service
        </p>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {(
            [
              { key: 'all', label: `All ${counts.all}` },
              { key: 'placed', label: `Placed ${counts.placed}` },
              { key: 'preparing', label: `Accepted ${counts.preparing}` },
              { key: 'ready', label: `Ready ${counts.ready}` },
              { key: 'closed', label: `Closed ${counts.closed}` },
            ]         
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-200',
                filter === f.key
                  ? 'border-forest bg-forest text-on-dark'
                  : 'border-border hover:border-primary/60',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <p className="mt-16 text-muted-foreground">Loading orders…</p>
      ) : visible.length === 0 ? (
        <div className="mt-8 rounded-md border border-border bg-surface px-8 py-20 text-center">
          <h2 className="font-display text-[24px]">Nothing here yet</h2>
          <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-muted-foreground">
            {counts.all === 0
              ? 'No orders have come in. Place one from the customer site to see it appear live.'
              : 'No orders match that filter.'}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                onAccept={() => accept.mutate(order.id)}
                onDeliver={() => deliver.mutate(order.id)}
                onCancel={() => setCancelling(order)}
                busy={
                  (accept.isPending && accept.variables === order.id) ||
                  (deliver.isPending && deliver.variables === order.id)
                }
              />
            </li>
          ))}
        </ul>
      )}

      {cancelling && (
        <CancelDialog
          order={cancelling}
          busy={cancel.isPending}
          onClose={() => setCancelling(null)}
          onConfirm={(input) => cancel.mutate({ id: cancelling.id, input })}
        />
      )}
    </>
  )
}

function OrderCard({
  order,
  onAccept,
  onDeliver,
  onCancel,
  busy,
}   
              
                      
                       
                      
               
 ) {
  const style = STATUS_STYLES[order.status]
  const hhmm = (iso        ) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const placedAt = order.timeline[0]?.at ?? order.createdAt
  const statusAt = order.timeline.at(-1)?.at

  const meta =
    order.status === 'placed'
      ? `${hhmm(placedAt)} · just in`
      : `${hhmm(placedAt)} · ${BADGE_LABELS[order.status].toLowerCase()} ${statusAt ? hhmm(statusAt) : ''}`

  const closed = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <article
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-md border border-l-4 border-border bg-surface',
        style.border,
        closed && 'opacity-75',
      )}
    >
      {order.status === 'cancelled' && (
        <span
          aria-hidden
          className="absolute top-8 -right-10 z-10 rotate-[-30deg] bg-destructive/85 px-12 py-1.5 text-[11px] font-bold tracking-[0.2em] text-destructive-foreground uppercase"
        >
          Unavailable
        </span>
      )}

      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[22px] tabular-nums">{order.orderNumber}</p>
          <span className={cn('eyebrow rounded-sm px-2 py-1', style.badge)}>
            {BADGE_LABELS[order.status]}
          </span>
        </div>

        <p className="mt-1.5 text-[12px] text-muted-foreground">{meta}</p>

        <p className="mt-4 text-[15px] font-semibold">{order.address.name}</p>
        <p className="text-[13px] text-muted-foreground">+91 {order.address.phone}</p>

        <ul className="mt-4 space-y-1.5">
          {order.items.map((item) => (
            <li key={item.dishId} className="flex gap-3 text-[13px]">
              <span className="text-muted-foreground tabular-nums">{item.qty} ×</span>
              <span>{item.name}</span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 rounded-sm bg-badge/60 px-3 py-2 text-[12px] text-terracotta-dark">
            {order.notes}
          </p>
        )}

        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="eyebrow text-muted-foreground">Total · cash</span>
          <span className="font-display text-[20px] tabular-nums">{formatINR(order.total)}</span>
        </div>

        {order.address.lat != null && order.address.lng != null && (
          <div className="relative mt-4">
            <MiniMap lat={order.address.lat} lng={order.address.lng} />
            <span className="absolute bottom-2 left-2 z-[500] rounded-sm bg-surface/95 px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
              Pune {order.address.pincode}
            </span>
          </div>
        )}

        {order.status === 'cancelled' && order.cancellation?.reason && (
          <p className="mt-4 text-[12px] text-muted-foreground">
            {order.cancellation.reason} · customer notified · nothing charged
          </p>
        )}

        {order.status === 'delivered' && (
          <p className="mt-4 text-[12px] text-muted-foreground">
            Cash collected · order closed
          </p>
        )}
      </div>

      {(order.status === 'placed' || order.status === 'ready') && (
        <div className="flex gap-3 border-t border-border p-5">
          {order.status === 'placed' ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={busy}
                className="flex-1 rounded-full bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-full border border-destructive/45 py-3 text-[14px] font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDeliver}
              disabled={busy}
              className="flex-1 rounded-full bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              Mark delivered
            </button>
          )}
        </div>
      )}

      {order.status === 'preparing' && (
        <p className="border-t border-border p-5 text-center text-[13px] text-muted-foreground">
          With the kitchen — waiting for the chef
        </p>
      )}
    </article>
  )
}
