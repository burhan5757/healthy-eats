import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The − 1 + control that replaces "Add" once a dish is in the cart.
 * Filled green circle on the plus, matching the menu design.
 */
export function QtyStepper({
  qty,
  onDecrease,
  onIncrease,
  dishName,
  className,
}: {
  qty: number
  onDecrease: () => void
  onIncrease: () => void
  dishName: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border border-primary/45 p-1 pl-1.5',
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        aria-label={qty === 1 ? `Remove ${dishName}` : `One less ${dishName}`}
        className="grid size-7 place-items-center rounded-full text-primary transition-colors duration-150 hover:bg-secondary"
      >
        <Minus className="size-3.5" strokeWidth={2.5} />
      </button>

      <span
        aria-live="polite"
        aria-label={`${qty} in order`}
        className="min-w-5 text-center text-sm font-semibold tabular-nums"
      >
        {qty}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        aria-label={`One more ${dishName}`}
        className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground transition-colors duration-150 hover:bg-primary-dark"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  )
}
