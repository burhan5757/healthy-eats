import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Cancelling asks WHICH dish ran out — the admin's answer is what flips those
 * dishes to "Unavailable today" on the public menu and tells the customer why
 * (CLAUDE.md §3). Picking nothing is allowed: that rejects the order without
 * touching the menu.
 */
export function CancelDialog({ order, onClose, onConfirm, busy }) {
  const [selected, setSelected] = useState([])
  const [reason, setReason] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const toggle = (dishId) =>
    setSelected((s) =>
      s.includes(dishId) ? s.filter((x) => x !== dishId) : [...s, dishId],
    )

  // The reason the customer reads. Auto-written from the picks, still editable.
  const autoReason =
    selected.length > 0
      ? `Sold out: ${order.items
          .filter((i) => selected.includes(i.dishId))
          .map((i) => i.name)
          .join(', ')}`
      : ''
  const finalReason =
    reason.trim() || autoReason || 'The kitchen could not take this order.'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-forest-deep/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        className="w-full max-w-[520px] rounded-md border border-border bg-surface p-7"
      >
        <p className="eyebrow text-muted-foreground">
          Cancel {order.orderNumber}
        </p>
        <h2 id="cancel-title" className="mt-3 font-display text-[26px]">
          Which dish ran out?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Anything you tick goes{' '}
          <strong className="text-foreground">Unavailable today</strong> on the
          public menu and resets tomorrow. Tick nothing to just reject this
          order.
        </p>

        <ul className="mt-6 space-y-2">
          {order.items.map((item) => {
            const on = selected.includes(item.dishId)
            return (
              <li key={item.dishId}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 transition-colors duration-150',
                    on
                      ? 'border-destructive bg-destructive/8'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(item.dishId)}
                    className="size-4 accent-[var(--he-alert,#a8442f)]"
                  />
                  <span className="flex-1 text-[15px]">{item.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    × {item.qty}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="mt-6">
          <label
            htmlFor="cancel-reason"
            className="eyebrow block text-muted-foreground"
          >
            Reason the customer sees
          </label>
          <input
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={autoReason || 'The kitchen could not take this order.'}
            className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-3 text-[15px] focus:border-primary"
          />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-6 py-3 text-[14px] font-semibold transition-colors hover:border-primary/60"
          >
            Keep the order
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm({ reason: finalReason, soldOutDishIds: selected })
            }
            className="rounded-full bg-destructive px-6 py-3 text-[14px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Cancelling…' : 'Cancel this order'}
          </button>
        </div>
      </div>
    </div>
  )
}
