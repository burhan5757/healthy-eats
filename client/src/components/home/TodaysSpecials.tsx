import { GOAL_LABELS, type Dish } from '@shared/index'
import {
  ButtonOutline,
  ButtonPill,
  Container,
  Eyebrow,
  GoalBadge,
  MacroRow,
} from '@/components/ui/primitives'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'
import { QtyStepper } from '@/components/menu/QtyStepper'
import { useCart, useQtyOf } from '@/store/cart'
import { cn, formatINR } from '@/lib/utils'

/**
 * "Off the pass" — an asymmetric editorial grid: one hero plate on the left,
 * two horizontal cards stacked on the right. Deliberately a different shape
 * from the bestsellers rail so the page doesn't read as two identical rows.
 */
export function TodaysSpecials({ dishes }: { dishes: Dish[] }) {
  if (dishes.length === 0) return null

  const [hero, ...rest] = dishes
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <section aria-labelledby="specials-heading" className="py-24">
      <Container>
        <Eyebrow>Today&apos;s specials</Eyebrow>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 id="specials-heading" className="text-[clamp(2rem,4.2vw,3rem)]">
            Off the pass, {today}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            Portioned for one · available till 22:30
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <HeroSpecial dish={hero} />

          <div className="grid gap-6 lg:grid-rows-2">
            {rest.slice(0, 2).map((dish) => (
              <SideSpecial key={dish.id} dish={dish} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

function HeroSpecial({ dish }: { dish: Dish }) {
  const soldOut = !dish.availableToday
  const qty = useQtyOf(dish.id)
  const add = useCart((s) => s.add)
  const setQty = useCart((s) => s.setQty)

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-md border border-border bg-surface',
        soldOut && 'opacity-70',
      )}
    >
      <div className="relative aspect-[16/11] border-b border-border">
        <PlatePlaceholder src={dish.image} alt={dish.name} />
        {soldOut && <SoldOutRibbon />}
      </div>

      <div className="flex flex-1 flex-col p-8">
        <GoalBadge className="self-start">
          Chef&apos;s pick{dish.goals[0] ? ` · ${GOAL_LABELS[dish.goals[0]]}` : ''}
        </GoalBadge>

        <h3 className="mt-5 font-display text-[clamp(1.85rem,3vw,2.5rem)] leading-tight">
          {dish.name}
        </h3>

        {dish.description && (
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
            {dish.description}
          </p>
        )}

        <div className="mt-auto pt-8">
          {dish.nutrition && (
            <MacroRow nutrition={dish.nutrition} className="border-t border-border pt-6" />
          )}

          <div className="mt-7 flex min-h-12 items-center justify-between gap-4">
            <p className="font-display text-[26px] tabular-nums">{formatINR(dish.price)}</p>

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
              <ButtonPill onClick={() => add(dish)}>Add to order</ButtonPill>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function SideSpecial({ dish }: { dish: Dish }) {
  const soldOut = !dish.availableToday
  const qty = useQtyOf(dish.id)
  const add = useCart((s) => s.add)
  const setQty = useCart((s) => s.setQty)

  return (
    <article
      className={cn(
        'grid overflow-hidden rounded-md border border-border bg-surface sm:grid-cols-[minmax(0,200px)_1fr]',
        soldOut && 'opacity-70',
      )}
    >
      <div className="relative aspect-[4/3] border-b border-border sm:aspect-auto sm:border-r sm:border-b-0">
        <PlatePlaceholder src={dish.image} alt={dish.name} />
        {soldOut && <SoldOutRibbon />}
      </div>

      <div className="flex flex-col p-7">
        {dish.goals[0] && <GoalBadge className="self-start">{GOAL_LABELS[dish.goals[0]]}</GoalBadge>}

        <h3 className="mt-4 font-display text-[26px] leading-tight">{dish.name}</h3>

        {dish.description && (
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {dish.description}
          </p>
        )}

        <div className="mt-auto pt-6">
          {dish.nutrition && (
            <MacroRow nutrition={dish.nutrition} className="border-t border-border pt-5" />
          )}

          <div className="mt-5 flex min-h-11 items-center justify-between gap-4">
            <p className="font-display text-[22px] tabular-nums">{formatINR(dish.price)}</p>

            {soldOut ? (
              <ButtonOutline disabled>Sold out</ButtonOutline>
            ) : qty > 0 ? (
              <QtyStepper
                qty={qty}
                dishName={dish.name}
                onDecrease={() => setQty(dish.id, qty - 1)}
                onIncrease={() => setQty(dish.id, qty + 1)}
              />
            ) : (
              <ButtonOutline onClick={() => add(dish)}>Add to order</ButtonOutline>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function SoldOutRibbon() {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-destructive px-4 py-2 text-center">
      <span className="eyebrow text-destructive-foreground">Unavailable today</span>
    </div>
  )
}
