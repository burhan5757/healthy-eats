import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, Clock, UtensilsCrossed, Settings2, LogOut } from 'lucide-react'
import { BRAND } from '@shared/index'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Live orders', icon: ClipboardList, end: true },
  { to: '/admin/history', label: 'Order history', icon: Clock, end: false },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings2, end: false },
]

export function AdminShell({ liveCount }: { liveCount?: number }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[215px] shrink-0 flex-col bg-forest-deep text-on-dark lg:flex">
        <div className="border-b border-on-dark-border px-6 py-6">
          <p className="font-display text-[24px] leading-none">{BRAND.name}</p>
          <p className="eyebrow mt-2 text-on-dark-muted">Kitchen admin · Kothrud</p>
        </div>

        <nav className="flex-1 py-4" aria-label="Admin">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-6 py-3 text-[14px] transition-colors duration-200',
                      isActive
                        ? 'bg-primary/25 font-semibold text-on-dark'
                        : 'text-on-dark/75 hover:text-on-dark',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.end && liveCount ? (
                    <span className="rounded-full bg-terracotta px-2 py-0.5 text-[11px] font-bold text-forest-deep tabular-nums">
                      {liveCount}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-on-dark-border px-6 py-5 text-[12px] text-on-dark-muted">
          <p>Service open · {BRAND.hours.replace('Mon – Sun, ', '')}</p>
          {user && <p className="mt-1">Signed in as {user.name}</p>}
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex items-center gap-1.5 text-on-dark/80 transition-colors hover:text-on-dark"
          >
            <LogOut className="size-3.5" strokeWidth={1.5} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile nav — the sidebar is desktop-only */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border bg-forest-deep px-4 py-3 lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors',
                  isActive ? 'bg-primary text-on-dark' : 'text-on-dark/70',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <main className="px-6 py-8 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
