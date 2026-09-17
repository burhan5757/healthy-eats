import { Link } from 'react-router-dom'
import { AtSign, MapPin, Phone, Clock } from 'lucide-react'
import { BRAND } from '@shared/index'
import { Container, Eyebrow } from '@/components/ui/primitives'
import { MiniMap } from '@/components/track/MiniMap'

/**
 * No design was supplied for Contact, so this is built from the existing tokens
 * and the real brand details.
 *
 * Deliberately NO message form: there is no endpoint to receive one, and a form
 * that silently goes nowhere is worse than not offering it. A neighbourhood
 * kitchen on cash-on-delivery is reached by phone anyway.
 */
export default function Contact() {
  const tel = BRAND.phone.replace(/\s/g, '')

  return (
    <Container className="pt-16 pb-24">
      <Eyebrow>Contact</Eyebrow>

      <h1 className="mt-5 max-w-[16ch] text-[clamp(2.5rem,5.5vw,4rem)]">
        Get in touch
      </h1>

      <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">
        Questions about a dish, a macro, or an order already on its way — call
        the kitchen directly during service hours.
      </p>

      <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_minmax(0,480px)]">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card icon={Phone} label="Call the kitchen">
            <a
              href={`tel:${tel}`}
              className="font-display text-[26px] transition-colors hover:text-primary"
            >
              {BRAND.phone}
            </a>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Best between 11:00 and 22:30, seven days a week.
            </p>
          </Card>

          <Card icon={Clock} label="Service hours">
            <p className="font-display text-[26px]">11:00 – 22:30</p>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Seven days. Last order at {BRAND.orderingHours.lastOrder}.
            </p>
          </Card>

          <Card icon={MapPin} label="Kitchen">
            <address className="text-[15px] leading-relaxed not-italic">
              {BRAND.address.line1}
              <br />
              {BRAND.address.line2}
            </address>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Collection isn&apos;t offered — everything goes out with a rider.
            </p>
          </Card>

          <Card icon={AtSign} label="Instagram">
            <a
              href={`https://instagram.com/${BRAND.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer noopener"
              className="font-display text-[22px] text-terracotta-text transition-opacity hover:opacity-80"
            >
              {BRAND.instagram}
            </a>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Today&apos;s specials go up before service.
            </p>
          </Card>

          <div className="rounded-md border border-border bg-surface p-7 sm:col-span-2">
            <Eyebrow>Where we deliver</Eyebrow>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {BRAND.deliveryAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-full border border-border px-5 py-2.5 text-[14px]"
                >
                  {area}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[14px] text-muted-foreground">
              Outside these areas? Call the kitchen to check availability.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-7">
          <Eyebrow>Find the kitchen</Eyebrow>
          <div className="mt-5 [&>div]:h-[320px]">
            <MiniMap lat={BRAND.geo.lat} lng={BRAND.geo.lng} />
          </div>

          <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
            {BRAND.address.line1}, {BRAND.address.line2}
          </p>

          <a
            href={`https://www.openstreetmap.org/?mlat=${BRAND.geo.lat}&mlon=${BRAND.geo.lng}#map=17/${BRAND.geo.lat}/${BRAND.geo.lng}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-block rounded-full border border-primary/45 px-6 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Open in maps
          </a>
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-6 border-t border-border pt-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[clamp(1.6rem,3vw,2rem)]">
            Hungry now, not curious?
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Skip the call — the menu shows exactly what&apos;s on the pass
            today.
          </p>
        </div>
        <Link
          to="/menu"
          className="shrink-0 self-start rounded-full bg-primary px-8 py-3.5 text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
        >
          View the Menu
        </Link>
      </div>
    </Container>
  )
}

function Card({ icon: Icon, label, children }) {
  return (
    <section className="rounded-md border border-border bg-surface p-7">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-terracotta" strokeWidth={1.75} />
        <Eyebrow>{label}</Eyebrow>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}
