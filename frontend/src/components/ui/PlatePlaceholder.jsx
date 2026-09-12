import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Stands in for dish photography until real images land.
 *
 * The design's placeholders carry "or browse files" affordances — those are
 * artifacts of the design tool, not part of the site, so they're intentionally
 * omitted here. This renders as a quiet, deliberate slot rather than a
 * broken-image state.
 */
export function PlatePlaceholder({ label, className, src, alt }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2',
        // Caption ink is darker than --color-muted-foreground: the placeholder
        // fill is itself mid-tone, so muted text only reached 3.7:1 on it.
        'bg-placeholder text-[#5A5F56]',
        className,
      )}
    >
      <ImageIcon className="size-6 opacity-55" strokeWidth={1.5} aria-hidden />
      {label ? <span className="px-4 text-center text-sm">{label}</span> : null}
    </div>
  )
}
