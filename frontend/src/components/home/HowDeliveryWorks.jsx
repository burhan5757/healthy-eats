import { CookingPot, MapPin, Soup, Banknote } from 'lucide-react'
import { Container, Eyebrow } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    icon: Soup,
    title: 'Pick your meal',
    body: 'Filter by goal, pick a plate, add it to the order. No account needed.',
  },
  {
    icon: MapPin,
    title: 'Drop your pin on the map',
    body: 'Move the pin to your gate and add a landmark so the rider finds you.',
  },
  {
    icon: CookingPot,
    title: 'Kitchen cooks it fresh',
    body: "Nothing is pre-plated. You'll see the ticket move from accepted to ready.",
  },
  {
    icon: Banknote,
    title: 'Pay cash on delivery',
    body: 'Exact change helps. No cards, no wallets, nothing stored online.',
  },
]

/**
 * Appears twice: as a dark full-width band on the homepage, and as a light card
 * on the About page. Same content, two treatments — hence the variant.
 */
export function HowDeliveryWorks({ variant = 'dark' }) {
  const dark = variant === 'dark'

  const body = (
    <>
      <Eyebrow onDark={dark}>How delivery works</Eyebrow>
      <h2
        className={cn(
          'mt-5',
          dark
            ? 'text-[clamp(2rem,4.2vw,3rem)]'
            : 'text-[clamp(1.75rem,3vw,2.25rem)]',
        )}
      >
        Four steps, cash at the door
      </h2>

      <ol
        className={cn(
          'grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4',
          dark ? 'mt-16' : 'mt-12',
        )}
      >
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className={cn(
              dark &&
                'lg:border-l lg:border-on-dark-border lg:pl-9 lg:first:border-l-0 lg:first:pl-0',
            )}
          >
            {dark && (
              <step.icon
                className="size-7 text-on-dark"
                strokeWidth={1.25}
                aria-hidden
              />
            )}

            <p
              className={cn(
                'eyebrow',
                dark ? 'mt-9 text-terracotta' : 'text-terracotta-text',
              )}
            >
              {String(i + 1).padStart(2, '0')}
            </p>

            <h3 className="mt-3 font-sans text-[16px] font-semibold tracking-normal">
              {step.title}
            </h3>

            <p
              className={cn(
                'mt-3 max-w-[34ch] text-[14px] leading-relaxed',
                dark ? 'text-on-dark-muted' : 'text-muted-foreground',
              )}
            >
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </>
  )

  if (!dark) {
    return (
      <section aria-labelledby="how-heading" className="pb-24">
        <Container>
          <div className="rounded-md border border-border bg-surface px-8 py-12 lg:px-12">
            {body}
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section aria-labelledby="how-heading" className="bg-forest text-on-dark">
      <Container className="py-24">{body}</Container>
    </section>
  )
}
