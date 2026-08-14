import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GOAL_LABELS, TIMING_LABELS, type Dish } from '@shared/index'
import { Container, Eyebrow, GoalBadge, ButtonOutline } from '@/components/ui/primitives'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'
import { cn, formatINR } from '@/lib/utils'

/**
 * "This week's regulars" — the bestsellers rail that opens the page, above the
 * brand block. Drag/swipe AND arrows, per the design's control affordances.
 */
export function Bestsellers({ dishes }: { dishes: Dish[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', loop: false, dragFree: false })
  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const sync = useCallback(() => {
    if (!embla) return
    setSelected(embla.selectedScrollSnap())
    setCanPrev(embla.canScrollPrev())
    setCanNext(embla.canScrollNext())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    setSnaps(embla.scrollSnapList())
    sync()
    embla.on('select', sync).on('reInit', sync)
  }, [embla, sync])

  if (dishes.length === 0) return null

  return (
    <section aria-labelledby="bestsellers-heading" className="pt-16 pb-20">
      <Container>
        <div className="flex items-end justify-between gap-8">
          <div>
            <Eyebrow>Most ordered</Eyebrow>
            <h2 id="bestsellers-heading" className="mt-4 text-[clamp(2.25rem,4.5vw,3.25rem)]">
              This week&apos;s regulars
            </h2>
          </div>

          <div className="hidden shrink-0 gap-3 sm:flex">
            <CarouselButton
              label="Previous dishes"
              disabled={!canPrev}
              onClick={() => embla?.scrollPrev()}
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </CarouselButton>
            <CarouselButton
              label="Next dishes"
              disabled={!canNext}
              onClick={() => embla?.scrollNext()}
            >
              <ChevronRight className="size-5" strokeWidth={1.5} />
            </CarouselButton>
          </div>
        </div>
      </Container>

      {/* Full-bleed rail: starts at the container gutter, runs off the right edge */}
      <div className="mt-10 overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6 pr-6 pl-6 lg:pl-14">
          {dishes.map((dish) => (
            <div
              key={dish.id}
              className="min-w-0 shrink-0 grow-0 basis-[85%] sm:basis-[48%] lg:basis-[31%] xl:basis-[23.5%]"
            >
              <DishCard dish={dish} />
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
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === selected}
              onClick={() => embla?.scrollTo(i)}
              className={cn(
                'size-2 rounded-full transition-colors duration-200',
                i === selected ? 'bg-primary' : 'bg-border hover:bg-muted-foreground/50',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CarouselButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-12 place-items-center rounded-full border border-border text-foreground',
        'transition-colors duration-200 hover:border-primary hover:text-primary',
        'disabled:pointer-events-none disabled:opacity-35',
      )}
    >
      {children}
    </button>
  )
}

function DishCard({ dish }: { dish: Dish }) {
  // Design shows the goal tag, falling back to timing for items like the shake
  // whose badge reads POST-WORKOUT.
  const tag = dish.goals[0]
    ? GOAL_LABELS[dish.goals[0]]
    : dish.timing[0]
      ? TIMING_LABELS[dish.timing[0]]
      : null

  const soldOut = !dish.availableToday

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface',
        'transition-shadow duration-300 hover:shadow-[0_2px_18px_-6px_rgba(26,38,32,0.16)]',
        soldOut && 'opacity-70',
      )}
    >
      <div className="relative aspect-[4/3] border-b border-border">
        <PlatePlaceholder src={dish.image} alt={dish.name} />
        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-destructive px-4 py-2 text-center">
            <span className="eyebrow text-destructive-foreground">Unavailable today</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {tag && <GoalBadge className="self-start">{tag}</GoalBadge>}

        <h3 className="mt-4 font-display text-[26px] leading-tight">{dish.name}</h3>

        <p className="mt-2 text-[15px] text-muted-foreground">
          {dish.nutrition.kcal} kcal · {dish.nutrition.protein} g protein
        </p>

        {/* mt-auto pins the price row to the card bottom so a two-line dish name
            doesn't knock this card out of alignment with its neighbours. */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-7">
          <p className="font-display text-[22px] tabular-nums">{formatINR(dish.price)}</p>
          <ButtonOutline disabled={soldOut}>{soldOut ? 'Sold out' : 'Add'}</ButtonOutline>
        </div>
      </div>
    </article>
  )
}
