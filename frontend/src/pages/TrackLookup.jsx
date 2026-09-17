import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Eyebrow } from '@/components/ui/primitives'
import { myOrders } from '@/store/myOrders'

/**
 * Where a customer types their order number — the tracking page tells them to
 * "type the order number on the site". Orders placed in this browser are
 * listed too, so most people never need to type anything.
 */
export default function TrackLookup() {
  const navigate = useNavigate()
  const [number, setNumber] = useState('')
  const recent = myOrders()

  const submit = (e) => {
    e.preventDefault()
    const clean = number.trim().toUpperCase()
    if (clean) navigate(`/track/${encodeURIComponent(clean)}`)
  }

  return (
    <Container className="pt-16 pb-24">
      <Eyebrow>Track an order</Eyebrow>
      <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)]">
        Where is my food?
      </h1>

      <form
        onSubmit={submit}
        className="mt-10 flex max-w-[520px] flex-wrap gap-3"
      >
        <label htmlFor="order-number" className="sr-only">
          Order number
        </label>
        <input
          id="order-number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="HE-7K4QXNPT"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-4 py-3 text-[15px] tracking-wide uppercase placeholder:normal-case placeholder:text-muted-foreground/55 focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-8 py-3 text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
        >
          Track
        </button>
      </form>
      <p className="mt-3 text-[13px] text-muted-foreground">
        The number is on the page you saw after placing the order.
      </p>

      {recent.length > 0 && (
        <section className="mt-14 max-w-[520px]">
          <h2 className="font-display text-[24px]">Ordered on this device</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recent.map((n) => (
              <li key={n}>
                <Link
                  to={`/track/${n}`}
                  className="flex items-center justify-between py-3.5 text-[15px] tabular-nums transition-colors hover:text-primary"
                >
                  {n}
                  <span className="text-[13px] text-muted-foreground">
                    Track →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  )
}
