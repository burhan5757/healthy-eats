import { Link } from 'react-router-dom'
import { GOALS, GOAL_LABELS, type Dish } from '@shared/index'
import { Container, Eyebrow } from '@/components/ui/primitives'
import { PlatePlaceholder } from '@/components/ui/PlatePlaceholder'

/**
 * "Pick the plate that matches the day" — the three goal packages plus the
 * cuisine sections, each a doorway into the pre-filtered menu.
 *
 * Note: this section was cut in planning, then appeared in the user's design.
 * The design wins — flagged in CLAUDE.md.
 */
const CUISINE_SECTIONS = ['Indian & Tandoor', 'Salads & Steam'] as const

export function GoalCollections({ dishes }: { dishes: Dish[] }) {
  const goalTiles = GOALS.map((goal) => ({
    key: goal,
    title: GOAL_LABELS[goal],
    count: dishes.filter((d) => d.goals.includes(goal)).length,
    to: `/menu?goal=${goal}`,
  }))

  const cuisineTiles = CUISINE_SECTIONS.map((category) => ({
    key: category,
    title: category,
    count: dishes.filter((d) => d.category === category).length,
    to: `/menu?category=${encodeURIComponent(category)}`,
  }))

  const tiles = [...goalTiles, ...cuisineTiles]

  return (
    <section aria-labelledby="collections-heading" className="pb-8">
      <Container>
        <Eyebrow>Eat for your goal</Eyebrow>
        <h2 id="collections-heading" className="mt-4 text-[clamp(2rem,4.2vw,3rem)]">
          Pick the plate that matches the day
        </h2>

        <ul className="mt-11 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile) => (
            <li key={tile.key}>
              <Link
                to={tile.to}
                className="group relative block aspect-[3/4] overflow-hidden rounded-md border border-border"
              >
                <PlatePlaceholder
                  className="transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                  alt=""
                />

                {/* Legibility scrim — the label sits on photography once it lands */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-forest via-forest/45 to-transparent"
                  aria-hidden
                />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display text-[22px] leading-tight text-on-dark">
                    {tile.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-on-dark-muted">
                    {tile.count} {tile.count === 1 ? 'dish' : 'dishes'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
