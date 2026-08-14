import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Wallet } from 'lucide-react'
import { BRAND, addressSchema, type Address } from '@shared/index'
import { api, ApiError } from '@/lib/api'
import { cartTotals, useCart } from '@/store/cart'
import { rememberOrder } from '@/store/myOrders'
import { Container } from '@/components/ui/primitives'
import { QtyStepper } from '@/components/menu/QtyStepper'
import { PinMap } from '@/components/checkout/PinMap'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'
import { cn, formatINR } from '@/lib/utils'

const STEPS = ['Your order', 'Delivery', 'Confirmed'] as const

export default function Checkout() {
  const navigate = useNavigate()
  const lines = useCart((s) => s.lines)
  const setQty = useCart((s) => s.setQty)
  const clear = useCart((s) => s.clear)

  const [form, setForm] = useState({ name: '', phone: '', line1: '', landmark: '' })
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Updating a field clears that field's error. Without this, a message like
   * "Name is required" stays on screen after the customer has fixed it.
   */
  const updateField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      if (!e[key]) return e
      const { [key]: _removed, ...rest } = e
      return rest
    })
  }

  const totals = cartTotals(lines)

  const place = useMutation({
    mutationFn: api.orders.place,
    onSuccess: ({ order }) => {
      rememberOrder(order.orderNumber)
      clear()
      navigate(`/track/${order.orderNumber}`, { replace: true })
    },
  })

  if (lines.length === 0 && !place.isPending) return <EmptyCart />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    // Same Zod schema the server validates with, so the two can never disagree.
    const address: Address = {
      ...form,
      pincode: '411038', // Kothrud — pin drop is the real locator
      ...(pin ?? {}),
    }

    const parsed = addressSchema.safeParse(address)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message
      setErrors(next)
      return
    }

    setErrors({})
    place.mutate({
      items: lines.map((l) => ({ dishId: l.dishId, qty: l.qty })),
      address: parsed.data,
      notes: notes.trim(),
    })
  }

  return (
    <div className="pb-24">
      <CheckoutHeader />

      <Container className="pt-12">
        <p className="eyebrow text-muted-foreground">Checkout · No account needed</p>
        <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)]">Where should the rider come?</h1>

        <form onSubmit={submit} className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* ---- Order summary ------------------------------------------- */}
          <section className="rounded-md border border-border bg-surface p-7">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-[24px]">Your order</h2>
              <Link
                to="/menu"
                className="text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Add more
              </Link>
            </div>

            <ul className="mt-6 divide-y divide-border border-t border-border">
              {lines.map((line) => (
                <li key={line.dishId} className="flex gap-4 py-5">
                  <div className="size-14 shrink-0 overflow-hidden rounded-sm border border-border">
                    <PlatePlaceholder alt="" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[17px] leading-tight text-primary">
                      {line.name}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {line.kcal} kcal · {line.protein} g protein
                    </p>
                    <QtyStepper
                      className="mt-3 w-fit"
                      qty={line.qty}
                      dishName={line.name}
                      onDecrease={() => setQty(line.dishId, line.qty - 1)}
                      onIncrease={() => setQty(line.dishId, line.qty + 1)}
                    />
                  </div>

                  <p className="font-display text-[17px] tabular-nums">
                    {formatINR(line.price * line.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="space-y-2.5 border-t border-border pt-5 text-[14px]">
              <Row label="Subtotal" value={formatINR(totals.subtotal)} />
              <Row
                label={`Delivery — ${BRAND.deliveryAreas[0]}`}
                value={totals.deliveryFee === 0 ? 'Free' : formatINR(totals.deliveryFee)}
                muted
              />
              <Row label="Packaging" value={formatINR(totals.packaging)} muted />
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
              <span className="eyebrow">Total</span>
              <span className="font-display text-[26px] tabular-nums">
                {formatINR(totals.total)}
              </span>
            </div>

            <div className="mt-6 flex gap-3 rounded-sm bg-badge/60 p-4">
              <Wallet className="mt-0.5 size-4 shrink-0 text-terracotta-dark" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-semibold text-terracotta-dark">
                  Cash on delivery only
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Pay the rider at your door. We don&apos;t take cards, UPI or wallets, and nothing
                  is stored online.
                </p>
              </div>
            </div>

            <p className="mt-4 text-[12px] text-muted-foreground">
              Kitchen closes at 22:30 · orders after 22:00 are cooked next day
            </p>
          </section>

          {/* ---- Details + pin -------------------------------------------- */}
          <div className="space-y-6">
            <section className="rounded-md border border-border bg-surface p-7">
              <h2 className="font-display text-[24px]">Your details</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Guest checkout — we only keep this for today&apos;s delivery.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  id="name"
                  label="Full name"
                  value={form.name}
                  error={errors.name}
                  onChange={(v) => updateField('name', v)}
                  autoComplete="name"
                  placeholder="Ananya Deshpande"
                />
                <Field
                  id="phone"
                  label="Phone"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(v) => updateField('phone', v)}
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="98230 11284"
                />
              </div>

              <div className="mt-5 grid gap-5">
                <Field
                  id="line1"
                  label="Address line"
                  value={form.line1}
                  error={errors.line1}
                  onChange={(v) => updateField('line1', v)}
                  autoComplete="street-address"
                  placeholder="Flat 402, Shreeban Residency, Dahanukar Colony"
                />
                <Field
                  id="landmark"
                  label="Landmark"
                  hint="helps the rider"
                  value={form.landmark}
                  error={errors.landmark}
                  onChange={(v) => updateField('landmark', v)}
                  placeholder="Opposite Kothrud Bus Depot, blue gate"
                />

                {/* Goes straight onto the chef's ticket — allergies matter. */}
                <div>
                  <label htmlFor="notes" className="eyebrow block text-muted-foreground">
                    Note for the kitchen{' '}
                    <span className="normal-case opacity-70">(allergies, preferences)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    maxLength={200}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="No peanut — allergy"
                    className="mt-2 w-full resize-none rounded-sm border border-border bg-background px-4 py-3 text-[15px] placeholder:text-muted-foreground/55 focus:border-primary"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border bg-surface p-7">
              <PinMap value={pin} onChange={setPin} />
            </section>

            {place.isError && (
              <p role="alert" className="rounded-sm bg-destructive/10 p-4 text-[14px] text-destructive">
                {place.error instanceof ApiError
                  ? place.error.message
                  : 'We could not place that order. Please try again.'}
              </p>
            )}

            <div className="flex flex-col gap-5 rounded-md bg-forest p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-semibold text-on-dark">
                  Cash to pay on delivery: {formatINR(totals.total)}
                </p>
                <p className="mt-1 text-[13px] text-on-dark-muted">
                  By placing this order you agree to be reachable on the phone number above.
                </p>
              </div>

              <button
                type="submit"
                disabled={place.isPending}
                className="shrink-0 rounded-full bg-primary px-9 py-4 text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark disabled:opacity-60"
              >
                {place.isPending ? 'Placing order…' : 'Place Order'}
              </button>
            </div>
          </div>
        </form>
      </Container>
    </div>
  )
}

function CheckoutHeader() {
  return (
    <div className="border-b border-border">
      <Container className="flex h-[72px] items-center justify-between gap-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-[22px] leading-none">{BRAND.name}</span>
          <span className="eyebrow text-muted-foreground">{BRAND.city}</span>
        </Link>

        <ol className="hidden items-center gap-3 md:flex">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className={cn('eyebrow', i <= 1 ? 'text-foreground' : 'text-muted-foreground')}>
                {i + 1} · {step}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-8 bg-border" aria-hidden />}
            </li>
          ))}
        </ol>

        <Link
          to="/menu"
          className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
          Back to menu
        </Link>
      </Container>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={muted ? 'text-muted-foreground' : ''}>{label}</dt>
      <dd className={cn('tabular-nums', muted && 'text-muted-foreground')}>{value}</dd>
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  value,
  error,
  onChange,
  ...rest
}: {
  id: string
  label: string
  hint?: string
  value: string
  error?: string
  onChange: (v: string) => void
  // Omit the native handlers this component replaces, or their types collide.
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow block text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 normal-case opacity-70">({hint})</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'mt-2 w-full rounded-sm border bg-background px-4 py-3 text-[15px]',
          'transition-colors duration-200 placeholder:text-muted-foreground/55',
          error ? 'border-destructive' : 'border-border focus:border-primary',
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function EmptyCart() {
  return (
    <Container className="py-32 text-center">
      <p className="eyebrow text-muted-foreground">Checkout</p>
      <h1 className="mt-4 text-4xl">Nothing in the order yet</h1>
      <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
        Add a plate or two from the menu and come back — the kitchen is open till 22:30.
      </p>
      <Link
        to="/menu"
        className="mt-9 inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
      >
        Browse the menu
      </Link>
    </Container>
  )
}
