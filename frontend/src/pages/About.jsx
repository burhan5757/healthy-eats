import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BRAND } from '@shared/index'
import { api } from '@/lib/api'
import { Container, Eyebrow } from '@/components/ui/primitives'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'
import { HowDeliveryWorks } from '@/components/home/HowDeliveryWorks'

/** All copy below is transcribed from the user's About design. */

const RULES = [
  {
    title: 'Nothing is pre-plated',
    body: 'Every order is cooked after it lands. It is why the kitchen quotes 35–45 minutes instead of ten.',
  },
  {
    title: 'The scale is not a suggestion',
    body: 'Plates are weighed before packing. If a portion is 180 g of chicken, it is 180 g — not “about”.',
  },
  {
    title: 'Macros reviewed by a dietitian',
    body: 'Sheetal reviews the card every quarter. If a number changes on the plate, it changes on the site.',
  },
  {
    title: 'Cash at the door, always',
    body: 'No cards, no wallets, nothing stored online. You pay the rider when the food is in your hand.',
  },
]

const CREDITS = [
  {
    label: 'Trained at',
    value: 'Hotel management, Pune · nine years on hotel lines',
  },
  { label: 'Team', value: 'Two on the hob, one on tandoor, one on packing' },
  {
    label: 'Macros by',
    value: 'Sheetal Kale, clinical dietitian, reviewed each quarter',
  },
]

export default function About() {
  // Dish count is read from the live menu rather than hardcoded, so it stays
  // honest as the real catalogue lands.
  const { data } = useQuery({ queryKey: ['menu'], queryFn: api.menu.list })
  // Counts dishes inside the three goal packages, matching the design's figure.
  // Sides, salads, tandoor and add-ons are extras, not part of a package.
  const dishCount = (data?.dishes ?? []).filter(
    (d) => d.goals.length > 0,
  ).length

  const stats = [
    {
      figure: BRAND.since,
      label: 'Cooking since',
      body: 'Started as tiffins for one gym in Kothrud.',
    },
    {
      figure: String(dishCount),
      label: 'Meals on the card',
      body: 'Three goal packages plus Indian, tandoor and salads.',
    },
    {
      figure: String(BRAND.deliveryAreas.length),
      label: 'Areas delivered',
      body: `${BRAND.deliveryAreas.slice(0, -1).join(', ')} and ${BRAND.deliveryAreas.at(-1)}.`,
    },
    {
      figure: '11:00',
      label: 'Hob on at',
      body: 'Service runs until 22:30, seven days a week.',
    },
  ]

  return (
    <>
      <Container className="pt-16 pb-20">
        <Eyebrow>About the kitchen</Eyebrow>

        <h1 className="mt-5 max-w-[18ch] text-[clamp(2.5rem,6vw,4.5rem)]">
          A kitchen that weighs the food before it weighs the words
        </h1>

        <p className="mt-8 max-w-[62ch] text-[17px] leading-relaxed text-muted-foreground">
          Healthy Eats started in {BRAND.since} as a two-burner tiffin service
          for a gym down the road in Kothrud. The ask was simple and it
          hasn&apos;t changed: food that tastes like home, portioned for a
          training goal, priced so you can eat it every day.
        </p>

        <div className="mt-14 aspect-[21/9] overflow-hidden rounded-md border border-border">
          <PlatePlaceholder
            label="The kitchen at service — wide shot, daylight"
            alt=""
          />
        </div>

        <dl className="mt-16 grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={
                i > 0 ? 'lg:border-l lg:border-border lg:pl-8' : 'lg:pr-8'
              }
            >
              <dd className="font-display text-[clamp(2rem,3.5vw,2.5rem)] leading-none tabular-nums">
                {stat.figure}
              </dd>
              <dt className="eyebrow mt-4 text-muted-foreground">
                {stat.label}
              </dt>
              <p className="mt-3 max-w-[30ch] text-[14px] leading-relaxed text-muted-foreground">
                {stat.body}
              </p>
            </div>
          ))}
        </dl>
      </Container>

      {/* --- The rules, on the dark band ---------------------------------- */}
      <section
        aria-labelledby="rules-heading"
        className="bg-forest text-on-dark"
      >
        <Container className="py-20">
          <Eyebrow onDark>What we hold to</Eyebrow>
          <h2
            id="rules-heading"
            className="mt-5 text-[clamp(1.85rem,3.6vw,2.6rem)]"
          >
            Four rules the kitchen doesn&apos;t bend
          </h2>

          <ol className="mt-14 grid gap-x-16 gap-y-10 md:grid-cols-2">
            {RULES.map((rule, i) => (
              <li
                key={rule.title}
                className="border-t border-on-dark-border pt-6"
              >
                <p className="eyebrow text-terracotta">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 font-sans text-[16px] font-semibold tracking-normal">
                  {rule.title}
                </h3>
                <p className="mt-2.5 max-w-[52ch] text-[14px] leading-relaxed text-on-dark-muted">
                  {rule.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* --- Who cooks your food ------------------------------------------ */}
      <Container className="py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
          <div className="aspect-[4/5] overflow-hidden rounded-md border border-border">
            <PlatePlaceholder label="Chef Ravi at the pass" alt="" />
          </div>

          <div>
            <Eyebrow>Who cooks your food</Eyebrow>
            <h2 className="mt-5 text-[clamp(1.85rem,3.6vw,2.6rem)]">
              Ravi Sathe, and a team of four
            </h2>

            <p className="mt-6 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
              Ravi trained in hotel kitchens for nine years before he got tired
              of cooking food he wouldn&apos;t eat on a Tuesday. He runs the
              pass every service. The Kolhapuri sukka is his grandmother&apos;s,
              minus half the oil — the only argument the family has ever had
              about it.
            </p>

            <dl className="mt-10">
              {CREDITS.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-2 border-t border-border py-4 sm:grid-cols-[160px_1fr] sm:gap-6"
                >
                  <dt className="eyebrow text-muted-foreground">{row.label}</dt>
                  <dd className="text-[14px] text-terracotta-text">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>

      <HowDeliveryWorks variant="card" />

      {/* --- Closing CTA --------------------------------------------------- */}
      <Container className="pb-24">
        <div className="flex flex-col gap-8 border-t border-border pt-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[clamp(1.75rem,3.2vw,2.25rem)]">
              Come see what&apos;s on the pass today
            </h2>
            <p className="mt-3 max-w-[56ch] text-[15px] text-muted-foreground">
              {dishCount} meals across three goal packages, cooked to order
              between 11:00 and 22:30.
            </p>
          </div>

          <Link
            to="/menu"
            className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-primary px-9 py-4 text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
          >
            View the Menu
            <ArrowRight
              className="size-4 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:translate-x-1"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
      </Container>
    </>
  )
}
