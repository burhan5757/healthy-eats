import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu as MenuIcon, X } from 'lucide-react'
import { BRAND } from '@shared/index'
import { Container } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Menu', to: '/menu' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the drawer on navigation, and on Escape.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-cream/90 backdrop-blur-sm transition-shadow duration-300',
        scrolled && 'shadow-[0_1px_0_0_var(--color-border)]',
      )}
    >
      <Container className="flex h-[76px] items-center justify-between gap-6 md:h-[92px]">
        <Link to="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-[24px] leading-none md:text-[28px]">
            {BRAND.name}
          </span>
          <span className="eyebrow text-muted-foreground">{BRAND.city}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-9">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'text-[15px] transition-colors duration-200 hover:text-foreground',
                      isActive
                        ? 'text-foreground underline decoration-[1.5px] underline-offset-[7px]'
                        : 'text-muted-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {/* Link, not <a> — an anchor would force a full page reload. */}
          <Link
            to="/menu"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark md:px-7 md:py-3"
          >
            Order Now
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-11 place-items-center rounded-full border border-border md:hidden"
          >
            {open ? (
              <X className="size-5" strokeWidth={1.5} />
            ) : (
              <MenuIcon className="size-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile drawer — the desktop nav is hidden below md, so this is the only
          way to reach Menu/About/Contact on a phone. */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-border bg-cream md:hidden"
      >
        <nav aria-label="Primary mobile">
          <ul className="flex flex-col px-6 py-2">
            {NAV.map((item) => (
              <li
                key={item.to}
                className="border-b border-border last:border-b-0"
              >
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'block py-4 font-display text-[22px]',
                      isActive ? 'text-foreground' : 'text-muted-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
