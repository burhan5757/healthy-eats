import { GOAL_LABELS, TIMING_LABELS } from '@shared/index'
import { ButtonOutline, GoalBadge } from '@/components/ui/primitives'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'
import { VegMark } from './VegMark'
import { QtyStepper } from './QtyStepper'
import { useCart, useQtyOf } from '@/store/cart'
import { cn, formatINR } from '@/lib/utils'

/**
 * Menu grid card. Denser than the landing card: adds the veg mark, the
 * ingredient line and the full four-cell macro row, per the menu design.
 */
export function MenuDishCard({ dish }) {
  const qty = useQtyOf(dish.id)
  const add = useCart((s) => s.add)
  const setQty = useCart((s) => s.setQty)

  const soldOut = !dish.availableToday
  const tag = dish.goals[0]
    ? GOAL_LABELS[dish.goals[0]]
    : dish.timing[0]
      ? TIMING_LABELS[dish.timing[0]]
      : null

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface',
        'transition-shadow duration-300 hover:shadow-[0_2px_18px_-6px_rgba(26,38,32,0.16)]',
        soldOut && 'opacity-65',
      )}
    >
      <div className="relative aspect-[4/3] border-b border-border">
        <PlatePlaceholder src={dish.image} alt={dish.name} label={dish.name} />

        <span className="absolute top-3 right-3 rounded-[3px] bg-surface/95 p-1">
          <VegMark diet={dish.diet} />
        </span>

        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-destructive px-3 py-1.5 text-center">
            <span className="eyebrow text-destructive-foreground">
              Unavailable today
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {tag && <GoalBadge className="self-start">{tag}</GoalBadge>}

        <h3 className="mt-3.5 font-display text-[21px] leading-tight text-primary">
          {dish.name}
        </h3>

        {/* mb keeps a gap above the macro divider even though `mt-auto` pins it down */}
        {dish.ingredients && (
          <p className="mt-1.5 mb-5 text-[13px] leading-snug text-terracotta-text">
            {dish.ingredients}
          </p>
        )}

        {/* Macros only render when the kitchen has supplied them — never zeros. */}
        {dish.nutrition ? (
          <dl className="mt-auto flex justify-between gap-2 border-t border-border pt-4 pb-1">
            {[
              { v: dish.nutrition.kcal, u: '', l: 'kcal' },
              { v: dish.nutrition.protein, u: ' g', l: 'prot' },
              { v: dish.nutrition.carbs, u: ' g', l: 'carb' },
              { v: dish.nutrition.fat, u: ' g', l: 'fat' },
            ].map((m) => (
              <div key={m.l}>
                <dd className="text-[13px] font-bold tabular-nums">
                  {m.v}
                  {m.u}
                </dd>
                <dt className="eyebrow mt-0.5 text-[9px] text-muted-foreground">
                  {m.l}
                </dt>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-auto border-t border-border pt-4 pb-1 text-[12px] text-muted-foreground">
            Macros on request
          </p>
        )}

        <div className="mt-4 flex min-h-11 items-center justify-between gap-3">
          <p className="font-display text-[19px] tabular-nums">
            {formatINR(dish.price)}
          </p>

          {soldOut ? (
            <ButtonOutline disabled className="px-4 py-2 text-[13px]">
              Sold out
            </ButtonOutline>
          ) : qty > 0 ? (
            <QtyStepper
              qty={qty}
              dishName={dish.name}
              onDecrease={() => setQty(dish.id, qty - 1)}
              onIncrease={() => setQty(dish.id, qty + 1)}
            />
          ) : (
            <ButtonOutline
              onClick={() => add(dish)}
              className="px-6 py-2 text-[13px]"
            >
              Add
            </ButtonOutline>
          )}
        </div>
      </div>
    </article>
  )
}
