import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ORDER_STATUS_LABELS } from '@shared/index'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/utils'

/**
 * Money monitoring — the second half of what admin was asked for, and the ONLY
 * place in the product where revenue appears (CLAUDE.md §7).
 *
 * Revenue counts delivered orders only. An order that was placed but cancelled
 * never earned anything, so it is tracked separately as lost value rather than
 * quietly inflating the totals.
 */
export default function History() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: api.orders.stats,
  })
  const orders = useQuery({
    queryKey: ['admin-orders'],
    queryFn: api.orders.all,
  })

  if (stats.isPending)
    return <p className="text-muted-foreground">Loading figures…</p>
  if (stats.isError)
    return <p className="text-destructive">Could not load the figures.</p>

  const s = stats.data
  const closed = (orders.data?.orders ?? []).filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled',
  )

  return (
    <>
      <p className="eyebrow text-muted-foreground">
        Money &amp; order monitoring
      </p>
      <h1 className="mt-4 text-[clamp(2rem,4vw,2.75rem)]">
        Today&apos;s history
      </h1>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue today"
          value={formatINR(s.todayRevenue)}
          hint="delivered orders only"
        />
        <Stat
          label="Orders today"
          value={String(s.todayOrders)}
          hint="all statuses"
        />
        <Stat
          label="Average order"
          value={formatINR(s.averageOrderValue)}
          hint="lifetime"
        />
        <Stat
          label="Lost to cancellations"
          value={formatINR(s.lostToCancellations)}
          hint="never charged — COD"
          tone="alert"
        />
      </ul>

      <section className="mt-10 rounded-md border border-border bg-surface p-7">
        <h2 className="font-display text-[24px]">Revenue, last 7 days</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Delivered orders, ₹ per day.
        </p>

        <div className="mt-8 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={s.daily}
              margin={{ top: 4, right: 4, bottom: 4, left: -12 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })
                }
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)' }}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
                formatter={(v) => [formatINR(Number(v)), 'Revenue']}
                labelFormatter={(d) =>
                  new Date(String(d)).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-7">
          <h2 className="font-display text-[24px]">Top dishes by revenue</h2>
          {s.topDishes.length === 0 ? (
            <p className="mt-6 text-[14px] text-muted-foreground">
              Nothing delivered yet, so there is nothing to rank.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-border border-t border-border">
              {s.topDishes.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <span className="text-[14px]">{d.name}</span>
                  <span className="flex items-baseline gap-4">
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {d.qty} sold
                    </span>
                    <span className="font-display text-[17px] tabular-nums">
                      {formatINR(d.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-border bg-surface p-7">
          <h2 className="font-display text-[24px]">Closed orders</h2>
          {closed.length === 0 ? (
            <p className="mt-6 text-[14px] text-muted-foreground">
              No delivered or cancelled orders yet.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-border border-t border-border">
              {closed.slice(0, 12).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <span>
                    <span className="font-display text-[16px] tabular-nums">
                      {o.orderNumber}
                    </span>
                    <span className="ml-3 text-[12px] text-muted-foreground">
                      {o.address.name}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-4">
                    <span
                      className={
                        o.status === 'cancelled'
                          ? 'eyebrow text-destructive'
                          : 'eyebrow text-muted-foreground'
                      }
                    >
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                    <span className="font-display text-[16px] tabular-nums">
                      {formatINR(o.total)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function Stat({ label, value, hint, tone }) {
  return (
    <li className="rounded-md border border-border bg-surface p-6">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p
        className={
          tone === 'alert'
            ? 'mt-3 font-display text-[30px] tabular-nums text-destructive'
            : 'mt-3 font-display text-[30px] tabular-nums'
        }
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
    </li>
  )
}
