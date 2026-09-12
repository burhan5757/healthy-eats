import { Check, X } from 'lucide-react'
import { ORDER_PROGRESS,                              } from '@shared/index'
import { cn } from '@/lib/utils'

const STEP_LABELS                                                  = {
  placed: 'Order Placed',
  preparing: 'Order Accepted',
  ready: 'Ready to Go',
  delivered: 'Delivered',
}

function timeOf(order       , status             )                {
  const entry = order.timeline.find((t) => t.status === status)
  if (!entry) return null
  return new Date(entry.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * The four-step horizontal track from the tracking design.
 * When an order is cancelled the track stops: reached steps stay marked, and
 * the step where it died carries the cancellation.
 */
export function StatusTrack({ order }                  ) {
  const cancelled = order.status === 'cancelled'
  // `cancelled` is not on the progress track, so it never has an index of its own.
  const currentIndex = cancelled
    ? ORDER_PROGRESS.indexOf('preparing')
    : ORDER_PROGRESS.indexOf(order.status                                   )

  const cancelledAt = order.timeline.find((t) => t.status === 'cancelled')

  return (
    <div>
      <p className="eyebrow text-muted-foreground">
        Order status{cancelled && ' · stopped'}
      </p>

      <ol className="mt-7 flex">
        {ORDER_PROGRESS.map((step, i) => {
          const reached = order.timeline.some((t) => t.status === step)
          const isDone = reached && !(cancelled && i > currentIndex)
          const isCancelPoint = cancelled && i === currentIndex && !reached
          const at = timeOf(order, step)

          return (
            <li key={step} className="relative flex flex-1 flex-col items-center">
              {/* Connector to the previous node */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-4 right-1/2 left-0 h-px -translate-y-1/2',
                    isDone ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              {i < ORDER_PROGRESS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-4 right-0 left-1/2 h-px -translate-y-1/2',
                    order.timeline.some((t) => t.status === ORDER_PROGRESS[i + 1]) && !cancelled
                      ? 'bg-primary'
                      : 'bg-border',
                  )}
                />
              )}

              <span
                className={cn(
                  'relative z-10 grid size-8 place-items-center rounded-full border text-[12px] font-semibold',
                  isDone && 'border-primary bg-primary text-primary-foreground',
                  isCancelPoint && 'border-destructive bg-destructive text-destructive-foreground',
                  !isDone && !isCancelPoint && 'border-border bg-background text-muted-foreground',
                )}
              >
                {isDone ? (
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                ) : isCancelPoint ? (
                  <X className="size-4" strokeWidth={2.5} aria-hidden />
                ) : (
                  i + 1
                )}
              </span>

              <span
                className={cn(
                  'mt-3 text-center text-[13px] font-medium',
                  isDone || isCancelPoint ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[step]}
              </span>

              <span className="mt-0.5 text-center text-[12px] text-muted-foreground tabular-nums">
                {isCancelPoint && cancelledAt
                  ? `cancelled ${new Date(cancelledAt.at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : (at ?? '—')}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
