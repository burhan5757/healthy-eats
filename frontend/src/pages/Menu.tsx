import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GOALS, GOAL_LABELS, isNonVeg, type Dish, type Goal } from '@shared/index'
import { api } from '@/lib/api'
import { Container, Eyebrow } from '@/components/ui/primitives'
import { MenuDishCard } from '@/components/menu/MenuDishCard'
import { MenuFilters, type DietFilter } from '@/components/menu/MenuFilters'
import { CartBar } from '@/components/menu/CartBar'

/** Cuisine sections sit alongside the goal packages in the filter row. */
const CUISINE_SECTIONS = ['Indian & Tandoor', 'Salads & Steam', 'Add-ons'] as const

export default function Menu() {
  const [params, setParams] = useSearchParams()
  const [diet, setDiet] = useState<DietFilter>('all')

  // The active category comes from the URL so the landing page's collection
  // tiles can deep-link straight into a filtered menu.
  const active = params.get('goal') ?? params.get('category') ?? 'all'

  const { data, isPending, isError } = useQuery({ queryKey: ['menu'], queryFn: api.menu.list })
  const dishes: Dish[] = useMemo(() => data?.dishes ?? [], [data])

  const categories = useMemo(
    () => [
      { key: 'all', label: 'All' },
      ...GOALS.map((g) => ({ key: g, label: GOAL_LABELS[g] })),
      ...CUISINE_SECTIONS.map((c) => ({ key: c, label: c })),
    ],
    [],
  )

  const filtered = useMemo(() => {
    return dishes.filter((d) => {
      const matchesCategory =
        active === 'all' ||
        d.goals.includes(active as Goal) ||
        d.category === active

      const matchesDiet =
        diet === 'all' || (diet === 'non-veg' ? isNonVeg(d.diet) : !isNonVeg(d.diet))

      return matchesCategory && matchesDiet
    })
  }, [dishes, active, diet])

  const handleCategory = (key: string) => {
    if (key === 'all') {
      setParams({}, { replace: true })
    } else if ((GOALS as readonly string[]).includes(key)) {
      setParams({ goal: key }, { replace: true })
    } else {
      setParams({ category: key }, { replace: true })
    }
  }

  const activeLabel = categories.find((c) => c.key === active)?.label ?? 'All'

  return (
    <>
      {/* pb leaves room for the fixed cart bar so it never permanently covers
          the last row of cards. */}
      <Container className="pt-16 pb-40 sm:pb-36">
        <Eyebrow>
          Full menu · {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} today
        </Eyebrow>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <h1 className="max-w-[13ch] text-[clamp(2.25rem,5vw,3.5rem)]">
            Everything on the pass today
          </h1>
          <p className="max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground lg:pb-2">
            Filter by what you&apos;re training for. Macros are per portion as served — nothing is
            rounded up.
          </p>
        </div>

        <div className="mt-12">
          <MenuFilters
            categories={categories}
            active={active}
            onCategoryChange={handleCategory}
            diet={diet}
            onDietChange={setDiet}
          />
        </div>

        {isPending ? (
          <MenuSkeleton />
        ) : isError ? (
          <MenuError />
        ) : (
          <>
            <p className="mt-10 text-[13px] text-muted-foreground">
              Showing {filtered.length} of {dishes.length} dishes · {activeLabel}
              {diet !== 'all' && ` · ${diet === 'veg' ? 'Veg' : 'Non-veg'}`}
            </p>

            {filtered.length === 0 ? (
              <EmptyResult onReset={() => { handleCategory('all'); setDiet('all') }} />
            ) : (
              <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((dish) => (
                  <li key={dish.id}>
                    <MenuDishCard dish={dish} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Container>

      <CartBar />
    </>
  )
}

function MenuSkeleton() {
  return (
    <ul
      className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="aspect-[4/3] bg-muted" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-20 rounded bg-muted" />
            <div className="h-6 w-4/5 rounded bg-muted" />
            <div className="h-3 w-3/5 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
          </div>
        </li>
      ))}
      <span className="sr-only">Loading the menu</span>
    </ul>
  )
}

function EmptyResult({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-6 rounded-md border border-border bg-surface px-8 py-20 text-center">
      <h2 className="font-display text-[26px]">Nothing on the pass for that</h2>
      <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
        No dish matches that combination today. Try a different goal, or clear the filters.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-8 rounded-full border border-primary/45 px-7 py-3 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
      >
        Clear filters
      </button>
    </div>
  )
}

function MenuError() {
  return (
    <div className="mt-16 rounded-md border border-border bg-surface px-8 py-20 text-center">
      <h2 className="font-display text-[26px]">The kitchen is not answering</h2>
      <p className="mx-auto mt-3 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
        We could not load the menu just now. Check that the server is running, then try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
      >
        Try again
      </button>
    </div>
  )
}
