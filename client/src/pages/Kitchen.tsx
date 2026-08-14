import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SOCKET_EVENTS, type Order } from '@shared/index'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { cn } from '@/lib/utils'

/**
 * Kitchen display. Deliberately DARK — the only dark screen in the product, and
 * the one place it is right: a wall-mounted screen read from three feet away in
 * a bright kitchen.
 *
 * Strictly operational. No revenue, no order counts beyond the queue itself,
 * no analytics — that is admin's and admin's only (CLAUDE.md §7).
 */
export default function Kitchen() {
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())

  const { data, isPending } = useQuery({
    queryKey: ['kitchen'],
    queryFn: api.orders.kitchen,
    refetchInterval: 30_000, // belt and braces behind the socket
  })

  // One timer drives every ticket's elapsed clock and the header time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['kitchen'] })
    socket.on(SOCKET_EVENTS.orderCreated, refresh)
    socket.on(SOCKET_EVENTS.orderUpdated, refresh)
    return () => {
      socket.off(SOCKET_EVENTS.orderCreated, refresh)
      socket.off(SOCKET_EVENTS.orderUpdated, refresh)
    }
  }, [queryClient])

  const markReady = useMutation({
    mutationFn: api.orders.ready,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen'] }),
  })

  const orders = data?.orders ?? []
  const incoming = orders.filter((o) => o.status === 'placed')
  const cooking = orders.filter((o) => o.status === 'preparing')
  const ready = orders.filter((o) => o.status === 'ready')
  const active = incoming.length + cooking.length

  return (
    <div className="min-h-dvh bg-[#16251C] text-[#F2F0E9]">
      <header className="flex items-center justify-between gap-6 border-b border-[#2C4033] px-6 py-3.5">
        <div className="flex items-center gap-4">
          <h1 className="font-sans text-[15px] font-bold tracking-tight">Healthy Eats · Kitchen</h1>
          <span className="flex items-center gap-2 rounded-full bg-[#E8A33D]/15 px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-[#E8A33D]" aria-hidden />
            <span className="text-[12px] font-semibold text-[#E8A33D]">
              {active} active {active === 1 ? 'ticket' : 'tickets'}
            </span>
          </span>
        </div>

        <div className="flex items-baseline gap-4">
          <span className="text-[12px] text-[#93A398]">Service till 22:30</span>
          <span className="text-[26px] font-bold tabular-nums">
            {new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {isPending ? (
        <p className="p-10 text-[#93A398]">Loading the pass…</p>
      ) : (
        <div className="grid gap-px bg-[#2C4033] md:grid-cols-3">
          <Column title="Incoming" count={incoming.length}>
            {incoming.map((o) => (
              <Ticket key={o.id} order={o} now={now} tone="incoming" />
            ))}
            {incoming.length === 0 && <Empty>Nothing waiting</Empty>}
          </Column>

          <Column title="Cooking" count={cooking.length}>
            {cooking.map((o) => (
              <Ticket
                key={o.id}
                order={o}
                now={now}
                tone="cooking"
                onReady={() => markReady.mutate(o.id)}
                busy={markReady.isPending && markReady.variables === o.id}
              />
            ))}
            {cooking.length === 0 && <Empty>Nothing on the stove</Empty>}
          </Column>

          <Column title="Ready" count={ready.length}>
            {ready.map((o) => (
              <Ticket key={o.id} order={o} now={now} tone="ready" />
            ))}
            {ready.length === 0 && <Empty>Nothing on the pass</Empty>}
          </Column>
        </div>
      )}
    </div>
  )
}

function Column({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="min-h-[calc(100dvh-61px)] bg-[#16251C] p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="eyebrow font-sans text-[#E8A33D]">{title}</h2>
        <span className="text-[14px] font-semibold text-[#93A398] tabular-nums">{count}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-[#2C4033] px-4 py-10 text-center text-[13px] text-[#5E7466]">
      {children}
    </p>
  )
}

/** mm:ss since the order was placed. */
function elapsed(order: Order, now: number): { label: string; minutes: number } {
  const placed = new Date(order.timeline[0]?.at ?? order.createdAt).getTime()
  const secs = Math.max(0, Math.floor((now - placed) / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return { label: `${m}:${String(s).padStart(2, '0')}`, minutes: m }
}

function Ticket({
  order,
  now,
  tone,
  onReady,
  busy,
}: {
  order: Order
  now: number
  tone: 'incoming' | 'cooking' | 'ready'
  onReady?: () => void
  busy?: boolean
}) {
  const { label, minutes } = elapsed(order, now)
  const isReady = tone === 'ready'

  // Ticket ages amber past 10 minutes, red past 20 — visible across the kitchen.
  const timerColor =
    minutes >= 20 ? 'text-[#F0684B]' : minutes >= 10 ? 'text-[#E8A33D]' : 'text-[#93A398]'

  const readyAt = order.timeline.find((t) => t.status === 'ready')

  return (
    <article
      className={cn(
        'overflow-hidden rounded-md border-l-4',
        isReady
          ? 'border-l-[#2C4033] bg-[#182720]'
          : tone === 'incoming'
            ? 'border-l-[#E8A33D] bg-[#1D3226]'
            : 'border-l-[#2F8055] bg-[#1D3226]',
      )}
    >
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-4">
          <p
            className={cn(
              'text-[26px] font-bold tabular-nums',
              isReady ? 'text-[#6E8375]' : 'text-white',
            )}
          >
            {order.orderNumber.replace(/^HE-/, '')}
          </p>

          {isReady ? (
            <p className="eyebrow font-sans text-[#6E8375]">
              Done{' '}
              {readyAt &&
                new Date(readyAt.at).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </p>
          ) : (
            <p className={cn('text-[15px] font-semibold tabular-nums', timerColor)}>{label}</p>
          )}
        </div>

        <ul className="mt-3.5 space-y-2">
          {order.items.map((item) => (
            <li key={item.dishId} className="flex gap-3 text-[15px]">
              <span
                className={cn(
                  'font-bold tabular-nums',
                  isReady ? 'text-[#6E8375]' : 'text-[#5BBF83]',
                )}
              >
                {item.qty}×
              </span>
              <span className={cn('font-semibold', isReady ? 'text-[#6E8375]' : 'text-white')}>
                {item.name}
              </span>
            </li>
          ))}
        </ul>

        {order.notes && !isReady && (
          <p className="mt-3.5 rounded-sm border border-[#5C5426] bg-[#4A4420]/60 px-3 py-2 text-[13px] font-medium text-[#EBDCA4]">
            {order.notes}
          </p>
        )}

        {tone === 'cooking' && (
          <button
            type="button"
            onClick={onReady}
            disabled={busy}
            className="mt-4 w-full rounded-sm bg-[#2F8055] py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-[#379363] disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Ready to Go'}
          </button>
        )}

        {tone === 'incoming' && (
          <p className="mt-4 w-full rounded-sm border border-dashed border-[#3E5C48] py-3 text-center text-[13px] font-semibold text-[#7E9686]">
            Waiting for admin to accept
          </p>
        )}
      </div>

      {isReady && (
        <p className="eyebrow border-t border-[#243A2C] px-4 py-2.5 font-sans text-[#5E7466]">
          On the pass — waiting for rider
        </p>
      )}
    </article>
  )
}
