import { useQuery } from '@tanstack/react-query'
import type { Dish } from '@shared/index'
import { api } from '@/lib/api'
import { Bestsellers } from '@/components/home/Bestsellers'
import { HeroBand } from '@/components/home/HeroBand'
import { TodaysSpecials } from '@/components/home/TodaysSpecials'
import { GoalCollections } from '@/components/home/GoalCollections'
import { FullMenuCta } from '@/components/home/FullMenuCta'
import { HowDeliveryWorks } from '@/components/home/HowDeliveryWorks'
import { Container } from '@/components/ui/primitives'

/**
 * Section order is the user's, confirmed twice and matched by their design:
 * bestsellers → brand → today's specials → collections → full menu → how it works.
 */
export default function Home() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['menu'],
    queryFn: api.menu.list,
  })

  const dishes: Dish[] = data?.dishes ?? []
  const bestsellers = dishes.filter((d) => d.isBestseller)
  const specials = dishes.filter((d) => d.isTodaysSpecial)

  if (isPending) return <HomeSkeleton />
  if (isError) return <HomeError />

  return (
    <>
      <Bestsellers dishes={bestsellers} />
      <HeroBand />
      <TodaysSpecials dishes={specials} />
      <GoalCollections dishes={dishes} />
      <FullMenuCta dishes={dishes} />
      <HowDeliveryWorks />
    </>
  )
}

function HomeSkeleton() {
  return (
    <div className="pt-16 pb-24" aria-busy>
      <Container>
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="mt-6 h-12 w-[min(28rem,80%)] rounded bg-muted" />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-md border border-border bg-surface">
              <div className="aspect-[4/3] bg-muted" />
              <div className="space-y-4 p-6">
                <div className="h-5 w-20 rounded bg-muted" />
                <div className="h-7 w-4/5 rounded bg-muted" />
                <div className="h-4 w-3/5 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </Container>
      <span className="sr-only">Loading the menu</span>
    </div>
  )
}

function HomeError() {
  return (
    <Container className="py-32 text-center">
      <h1 className="text-4xl">The kitchen is not answering</h1>
      <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
        We could not load the menu just now. Check that the server is running, then try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-9 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
      >
        Try again
      </button>
    </Container>
  )
}
