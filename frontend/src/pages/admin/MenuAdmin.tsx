import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GOAL_LABELS, type Dish } from '@shared/index'
import { api } from '@/lib/api'
import { VegMark } from '@/components/menu/VegMark'
import { cn, formatINR } from '@/lib/utils'

/**
 * Availability manager. Cancelling an order marks its dishes sold out
 * automatically, but the kitchen also needs to flip a dish by hand when it runs
 * out without anyone ordering it. Everything resets next calendar day.
 */
export default function MenuAdmin() {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ['menu'], queryFn: api.menu.list })

  const setAvailability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.menuAdmin.setAvailability(id, available),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  })

  if (isPending) return <p className="text-muted-foreground">Loading the menu…</p>

  const dishes = data?.dishes ?? []
  const soldOut = dishes.filter((d) => !d.availableToday)

  return (
    <>
      <p className="eyebrow text-muted-foreground">Menu availability</p>
      <h1 className="mt-4 text-[clamp(2rem,4vw,2.75rem)]">What&apos;s on the pass</h1>
      <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
        Turning a dish off hides it from ordering and shows{' '}
        <strong className="text-foreground">Unavailable today</strong> on the public menu. Everything
        comes back automatically tomorrow.
      </p>

      {soldOut.length > 0 && (
        <div className="mt-8 rounded-md border border-destructive/30 bg-destructive/8 px-6 py-5">
          <p className="eyebrow text-destructive">Sold out today · {soldOut.length}</p>
          <p className="mt-2 text-[14px]">{soldOut.map((d) => d.name).join(', ')}</p>
        </div>
      )}

      <ul className="mt-8 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
        {dishes.map((dish) => (
          <li key={dish.id}>
            <Row
              dish={dish}
              busy={setAvailability.isPending && setAvailability.variables?.id === dish.id}
              onToggle={() =>
                setAvailability.mutate({ id: dish.id, available: !dish.availableToday })
              }
            />
          </li>
        ))}
      </ul>
    </>
  )
}

function Row({
  dish,
  onToggle,
  busy,
}: {
  dish: Dish
  onToggle: () => void
  busy: boolean
}) {
  const available = dish.availableToday

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 px-6 py-4 transition-colors',
        !available && 'bg-destructive/4',
      )}
    >
      <VegMark diet={dish.diet} />

      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] font-semibold', !available && 'text-muted-foreground')}>
          {dish.name}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {dish.category}
          {dish.goals[0] && ` · ${GOAL_LABELS[dish.goals[0]]}`}
          {dish.nutrition ? ` · ${dish.nutrition.kcal} kcal` : ''}
        </p>
      </div>

      <p className="font-display text-[17px] tabular-nums">{formatINR(dish.price)}</p>

      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-label={`${dish.name} — ${available ? 'available, turn off' : 'sold out, turn back on'}`}
        onClick={onToggle}
        disabled={busy}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
          available ? 'bg-primary' : 'bg-muted-foreground/35',
        )}
      >
        {/* Positioned with left/right rather than a transform — an absolute span
            with no inset has no reliable origin to translate from. */}
        <span
          className={cn(
            'absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all duration-200',
            available ? 'left-6' : 'left-1',
          )}
        />
      </button>

      <span
        className={cn(
          'eyebrow w-[110px] shrink-0 text-right',
          available ? 'text-primary' : 'text-destructive',
        )}
      >
        {available ? 'On the pass' : 'Sold out'}
      </span>
    </div>
  )
}
