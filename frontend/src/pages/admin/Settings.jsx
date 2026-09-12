import { BRAND } from '@shared/index'
import { useAuth } from '@/store/auth'

/**
 * Read-only for now. The design shows a Settings item in the sidebar but no
 * screen for it, so this surfaces the values the app actually runs on rather
 * than inventing controls that do nothing.
 */
export default function Settings() {
  const { user } = useAuth()

  return (
    <>
      <p className="eyebrow text-muted-foreground">Settings</p>
      <h1 className="mt-4 text-[clamp(2rem,4vw,2.75rem)]">Kitchen details</h1>
      <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
        These are read-only while the menu and brand details live in code. They
        become editable once the real menu lands.
      </p>

      <dl className="mt-10 grid max-w-[720px] gap-px overflow-hidden rounded-md border border-border bg-border">
        <Row
          label="Kitchen"
          value={`${BRAND.address.line1}, ${BRAND.address.line2}`}
        />
        <Row label="Phone" value={BRAND.phone} />
        <Row label="Service hours" value={BRAND.hours} />
        <Row label="Delivery areas" value={BRAND.deliveryAreas.join(' · ')} />
        <Row label="Payment" value="Cash on delivery only" />
        <Row label="FSSAI" value={BRAND.fssai} />
        <Row
          label="Signed in as"
          value={user ? `${user.name} · ${user.role}` : '—'}
        />
      </dl>
    </>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 bg-surface px-6 py-4">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="text-[15px]">{value}</dd>
    </div>
  )
}
