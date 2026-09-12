import { cn } from '@/lib/utils'

;                                                 

/**
 * Two controls, matching the menu design:
 *  - a row of category pills (All + goal packages + cuisine sections)
 *  - a segmented veg / non-veg switch on the right
 */
export function MenuFilters({
  categories,
  active,
  onCategoryChange,
  diet,
  onDietChange,
}   
                                              
                
                                         
                  
                                       
 ) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="group"
        aria-label="Filter by category"
        className="no-scrollbar -mx-6 flex gap-2.5 overflow-x-auto px-6 lg:mx-0 lg:flex-wrap lg:px-0"
      >
        {categories.map((c) => {
          const isActive = active === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onCategoryChange(c.key)}
              aria-pressed={isActive}
              className={cn(
                'shrink-0 rounded-full border px-5 py-2.5 text-[13px] font-medium transition-colors duration-200',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:border-primary/60',
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <div
        role="group"
        aria-label="Filter by diet"
        className="flex shrink-0 self-start rounded-full border border-border p-1 lg:self-auto"
      >
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'veg', label: 'Veg' },
            { key: 'non-veg', label: 'Non-veg' },
          ]         
        ).map((d) => {
          const isActive = diet === d.key
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onDietChange(d.key)}
              aria-pressed={isActive}
              className={cn(
                'rounded-full px-5 py-2 text-[13px] font-medium transition-colors duration-200',
                isActive
                  ? 'bg-forest text-on-dark'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {d.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
