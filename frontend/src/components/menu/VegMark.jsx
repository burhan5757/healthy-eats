import { isNonVeg } from '@shared/index'
import { cn } from '@/lib/utils'

/**
 * The standard Indian veg / non-veg mark: a filled dot inside a square outline,
 * green for veg and maroon for non-veg. Legally expected on Indian food listings,
 * and present on every card in the menu design.
 */
export function VegMark({ diet, className }) {
  const nonVeg = isNonVeg(diet)
  const label = nonVeg ? 'Non-vegetarian' : 'Vegetarian'

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[3px] border',
        nonVeg ? 'border-[#9B2C2C]' : 'border-[#1E5E43]',
        className,
      )}
    >
      <span
        className={cn(
          'size-2 rounded-[1px]',
          nonVeg ? 'bg-[#9B2C2C]' : 'bg-[#1E5E43]',
        )}
        aria-hidden
      />
    </span>
  )
}
