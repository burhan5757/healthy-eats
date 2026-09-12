import { Link } from 'react-router-dom'
import { cartCount, cartSubtotal, useCart } from '@/store/cart'
import { formatINR } from '@/lib/utils'

/**
 * Sticky cart pill, bottom-right, exactly as in the menu design.
 * Shows subtotal (not grand total) — fees are revealed at checkout.
 */
export function CartBar() {
  const lines = useCart((s) => s.lines)
  const count = cartCount(lines)

  if (count === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:p-0">
      <div className="pointer-events-auto flex items-center gap-5 rounded-full bg-forest py-2.5 pr-2.5 pl-7 shadow-[0_8px_28px_-8px_rgba(19,33,25,0.5)]">
        <div>
          <p className="eyebrow text-on-dark-muted">
            {count} {count === 1 ? 'item' : 'items'}
          </p>
          <p className="font-display text-[19px] tabular-nums text-on-dark">
            {formatINR(cartSubtotal(lines))}
          </p>
        </div>

        <Link
          to="/checkout"
          className="rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
        >
          Checkout
        </Link>
      </div>
    </div>
  )
}
