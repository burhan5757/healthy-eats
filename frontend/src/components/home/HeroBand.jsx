import { BRAND } from '@shared/index'
import { Container, Eyebrow } from '@/components/ui/primitives'

/**
 * The brand moment — a deep forest band that lands like a title card after the
 * bestsellers rail. This is the section order the user asked for: dishes first,
 * brand second.
 */
export function HeroBand() {
  return (
    <section aria-labelledby="hero-heading" className="bg-forest text-on-dark">
      <Container className="py-24 lg:py-32">
        <Eyebrow onDark>{BRAND.kitchenLabel}</Eyebrow>

        <h1
          id="hero-heading"
          className="mt-7 max-w-[17ch] text-[clamp(2.75rem,6.2vw,5.25rem)] font-normal"
        >
          {BRAND.tagline}
        </h1>

        <ul className="mt-14 flex flex-wrap gap-4">
          {BRAND.heroPills.map((pill) => (
            <li
              key={pill}
              className="flex items-center gap-3 rounded-full border border-on-dark-border px-6 py-3.5"
            >
              <span className="size-1.5 rounded-full bg-terracotta" aria-hidden />
              <span className="text-[15px]">{pill}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
