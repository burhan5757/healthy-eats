import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { BRAND, GOAL_LABELS, GOALS } from '@shared/index'
import { Container, Eyebrow } from '@/components/ui/primitives'

/** The "View Menu" moment — the page's single strongest CTA. */
export function FullMenuCta({ dishes }) {
  const packages = GOALS.map((g) => GOAL_LABELS[g])

  // "N meals, three goal packages" counts dishes that BELONG to a goal package.
  // Sides, salads, tandoor and add-ons are sold alongside them, not within them.
  const packageMeals = dishes.filter((d) => d.goals.length > 0).length

  return (
    <section aria-labelledby="full-menu-heading" className="py-24">
      <Container>
        <div className="rounded-lg border border-border bg-surface px-8 py-14 lg:px-16 lg:py-20">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-20">
            <div className="max-w-[34ch]">
              <Eyebrow>The full menu</Eyebrow>

              <h2
                id="full-menu-heading"
                className="mt-5 text-[clamp(2rem,4.2vw,3.25rem)]"
              >
                {packageMeals} meals, three goal packages, one kitchen
              </h2>

              <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
                {packages.slice(0, -1).join(', ')} and {packages.at(-1)}{' '}
                packages, plus the Indian, Tandoor and salad sections, each
                plate tagged with the goal it suits.
              </p>

              <p className="mt-6 text-[13px] text-muted-foreground">
                {BRAND.kitchenHours} · every plate weighed · prices in ₹
              </p>
            </div>

            <Link
              to="/menu"
              className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-primary px-9 py-4 text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark lg:self-auto"
            >
              View More Menu
              <ArrowRight
                className="size-4 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:translate-x-1"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
