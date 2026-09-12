                                      
import { cn } from '@/lib/utils'

/** Page gutter — one width, used by every section so edges line up. */
export function Container({
  children,
  className,
}   
                     
                    
 ) {
  return <div className={cn('mx-auto w-full max-w-[1360px] px-6 lg:px-14', className)}>{children}</div>
}

/** Letterspaced section eyebrow, e.g. MOST ORDERED. */
export function Eyebrow({
  children,
  onDark = false,
  className,
}   
                     
                  
                    
 ) {
  return (
    <p
      className={cn(
        'eyebrow',
        onDark ? 'text-on-dark-muted' : 'text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  )
}

/** Goal badge — tan pill, e.g. FAT LOSS. */
export function GoalBadge({ children, className }                                             ) {
  return (
    <span
      className={cn(
        'eyebrow inline-flex items-center rounded-sm bg-badge px-2.5 py-1.5 text-terracotta-dark',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Solid green pill CTA. */
export function ButtonPill({
  children,
  className,
  as: As = 'button',
  ...rest
}   
                     
                    
                     
                                                   
                                               ) {
  return (
    <As
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3',
        'text-sm font-semibold text-primary-foreground',
        'transition-colors duration-200 hover:bg-primary-dark',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  )
}

/** Outlined pill — the "Add" / "Add to order" treatment. */
export function ButtonOutline({
  children,
  className,
  ...rest
}                                                                                             ) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-primary/45 px-6 py-2.5',
        'text-sm font-semibold text-primary',
        'transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent',
        'disabled:text-muted-foreground disabled:hover:bg-transparent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Macro readout — big figure over an uppercase caption, as in the design's
 * specials cards. Protein carries no special colour here; the design keeps
 * the whole row in one ink.
 */
export function MacroRow({
  nutrition,
  className,
}   
                                                                          
                    
 ) {
  const cells = [
    { value: nutrition.kcal, unit: '', label: 'kcal' },
    { value: nutrition.protein, unit: ' g', label: 'protein' },
    { value: nutrition.carbs, unit: ' g', label: 'carbs' },
    { value: nutrition.fat, unit: ' g', label: 'fat' },
  ]

  return (
    <dl className={cn('flex gap-8', className)}>
      {cells.map((c) => (
        <div key={c.label}>
          <dd className="text-[15px] font-bold tabular-nums">
            {c.value}
            {c.unit}
          </dd>
          <dt className="eyebrow mt-0.5 text-muted-foreground">{c.label}</dt>
        </div>
      ))}
    </dl>
  )
}
