import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GOAL_LABELS, TIMING_LABELS } from '@shared/index'
import {
  Container,
  Eyebrow,
  GoalBadge,
  ButtonPill,
  MacroRow,
} from '@/components/ui/primitives'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'
import { QtyStepper } from '@/components/menu/QtyStepper'
import { useCart, useQtyOf } from '@/store/cart'
import { cn, formatINR } from '@/lib/utils'

const AUTOPLAY_DELAY_MS = 3000

/**
 * "This week's regulars" — a spotlight slider that highlights one dish at a
 * time (full-bleed, above the brand). Auto-advances and supports drag/swipe
 * plus arrows and dots, per the design's control affordances. Autoplay is
 * skipped entirely under prefers-reduced-motion.
 */
export function Bestsellers({ dishes }) {
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  // stopOnMouseEnter is deliberately NOT used: combined with stopOnInteraction,
  // the plugin only wires up its own mouseenter listener, never the matching
  // mouseleave one (see its source), so a mouse merely passing over the
  // carousel — no click needed — stops autoplay for good with no way back.
  const autoplay = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      stopOnInteraction: true,
    }),
  )

  const [emblaRef, embla] = useEmblaCarousel(
    { align: 'start', loop: true, dragFree: false },
    reducedMotion ? [] : [autoplay.current],
  )
  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState([])

  const sync = useCallback(() => {
    if (!embla) return
    setSelected(embla.selectedScrollSnap())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    setSnaps(embla.scrollSnapList())
    sync()
    embla.on('select', sync).on('reInit', sync)
  }, [embla, sync])

  if (dishes.length === 0) return null

  // The plugin's own stopOnInteraction only fires on a drag/pointerDown
  // inside the carousel viewport — it never sees clicks on these external
  // arrow/dot controls, so autoplay would otherwise keep ticking (and yank
  // the slide away) after someone deliberately picked a dish.
  const stopAutoplay = () => {
    if (!reducedMotion) autoplay.current.stop()
  }

  return (
    <section aria-labelledby="bestsellers-heading" className="pt-16 pb-20">
      <Container>
        <div className="flex items-end justify-between gap-8">
          <div>
            <Eyebrow>Most ordered</Eyebrow>
            <h2
              id="bestsellers-heading"
              className="mt-4 text-[clamp(2.25rem,4.5vw,3.25rem)]"
            >
              This week&apos;s regulars
            </h2>
          </div>

          <div className="hidden shrink-0 gap-3 sm:flex">
            <CarouselButton
              label="Previous dish"
              onClick={() => {
                stopAutoplay()
                embla?.scrollPrev()
              }}
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </CarouselButton>
            <CarouselButton
              label="Next dish"
              onClick={() => {
                stopAutoplay()
                embla?.scrollNext()
              }}
            >
              <ChevronRight className="size-5" strokeWidth={1.5} />
            </CarouselButton>
          </div>
        </div>
      </Container>

      {/* Padding lives on each slide (matching Container's px-6 lg:px-14), not
          the flex wrapper — wrapper padding would shrink the width basis-full
          resolves against, leaving the next slide peeking in at rest. */}
      {/* select-none: dragging to swipe would otherwise select the dish name/
          price underneath the cursor, same as any draggable carousel. */}
      <div className="mt-10 overflow-hidden select-none" ref={emblaRef}>
        <div className="flex">
          {dishes.map((dish, i) => (
            <div
              key={dish.id}
              className="min-w-0 shrink-0 grow-0 basis-full px-6 lg:px-14"
              aria-hidden={i !== selected}
            >
              <SpotlightCard dish={dish} />
            </div>
          ))}
        </div>
      </div>

      {snaps.length > 1 && (
        <div className="mt-10 flex justify-center gap-2.5">
          {snaps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Highlight ${dishes[i]?.name ?? `dish ${i + 1}`}`}
              aria-current={i === selected}
              onClick={() => {
                stopAutoplay()
                embla?.scrollTo(i)
              }}
              className={cn(
                'size-2 rounded-full transition-colors duration-200',
                i === selected
                  ? 'bg-primary'
                  : 'bg-border hover:bg-muted-foreground/50',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CarouselButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-12 place-items-center rounded-full border border-border text-foreground',
        'transition-colors duration-200 hover:border-primary hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

/** The one dish currently in the spotlight — a large editorial split card. */
function SpotlightCard({ dish }) {
  // Design shows the goal tag, falling back to timing for items like the shake
  // whose badge reads POST-WORKOUT.
  const tag = dish.goals[0]
    ? GOAL_LABELS[dish.goals[0]]
    : dish.timing[0]
      ? TIMING_LABELS[dish.timing[0]]
      : null

  const qty = useQtyOf(dish.id)
  const add = useCart((s) => s.add)
  const setQty = useCart((s) => s.setQty)

  const soldOut = !dish.availableToday

  return (
    <article
      className={cn(
        'grid overflow-hidden rounded-md border border-border bg-surface',
        'md:grid-cols-2',
        soldOut && 'opacity-70',
      )}
    >
      <div className="relative aspect-[16/9] border-b border-border md:border-r md:border-b-0">
        <PlatePlaceholder src={dish.image} alt={dish.name} />
        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-destructive px-4 py-2 text-center">
            <span className="eyebrow text-destructive-foreground">
              Unavailable today
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center p-5 lg:p-8">
        {tag && <GoalBadge className="self-start">{tag}</GoalBadge>}

        <h3 className="mt-3 font-display text-[clamp(1.4rem,2.4vw,2rem)] leading-tight">
          {dish.name}
        </h3>

        {dish.nutrition && (
          <MacroRow
            nutrition={dish.nutrition}
            className="mt-3 border-t border-border pt-3"
          />
        )}

        <div className="mt-4 flex min-h-11 items-center justify-between gap-4">
          <p className="font-display text-[22px] tabular-nums">
            {formatINR(dish.price)}
          </p>

          {soldOut ? (
            <ButtonPill disabled>Sold out today</ButtonPill>
          ) : qty > 0 ? (
            <QtyStepper
              qty={qty}
              dishName={dish.name}
              onDecrease={() => setQty(dish.id, qty - 1)}
              onIncrease={() => setQty(dish.id, qty + 1)}
            />
          ) : (
            <ButtonPill onClick={() => add(dish)}>Add</ButtonPill>
          )}
        </div>
      </div>
    </article>
  )
}
