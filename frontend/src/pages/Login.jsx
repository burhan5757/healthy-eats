import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { BRAND } from '@shared/index'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { Container } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/**
 * Staff sign-in. Each role has its own page and its own API endpoint
 * (/api/auth/<role>/login), which only accepts that role's accounts.
 *
 * There is deliberately no "create account" link: admin and chef are seeded
 * server-side, and driver accounts are created by admin (CLAUDE.md §10).
 */
const STAFF_LOGINS = {
  admin: {
    path: '/admin/login',
    home: '/admin',
    title: 'Admin',
    blurb: 'Order monitoring, revenue, menu and drivers.',
  },
  chef: {
    path: '/kitchen/login',
    home: '/kitchen',
    title: 'Kitchen',
    blurb: 'The ticket screen for the pass.',
  },
  driver: {
    path: '/driver/login',
    home: '/driver',
    title: 'Driver',
    blurb: 'Your assigned deliveries.',
  },
}

/** `/login` — kept so old links still land somewhere useful. */
export default function LoginHub() {
  return (
    <Frame>
      <div className="mt-10 rounded-md border border-border bg-surface p-8">
        <p className="eyebrow text-muted-foreground">Staff sign in</p>
        <h1 className="mt-3 text-[30px]">Who&apos;s signing in?</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Customers don&apos;t need an account — ordering is guest checkout.
        </p>
        <ul className="mt-7 space-y-3">
          {Object.entries(STAFF_LOGINS).map(([role, cfg]) => (
            <li key={role}>
              <Link
                to={cfg.path}
                className="block rounded-md border border-border px-5 py-4 transition-colors hover:border-primary/60"
              >
                <span className="font-display text-[20px]">{cfg.title}</span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  {cfg.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  )
}

export function StaffLogin({ role }) {
  const cfg = STAFF_LOGINS[role]
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: (input) => api.auth.login(role, input),
    onSuccess: ({ user }) => {
      setUser(user)
      navigate(cfg.home, { replace: true })
    },
  })

  if (user?.role === role) return <Navigate to={cfg.home} replace />

  return (
    <Frame>
      <div className="mt-10 rounded-md border border-border bg-surface p-8">
        <p className="eyebrow text-muted-foreground">Staff sign in</p>
        <h1 className="mt-3 text-[30px]">{cfg.title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {cfg.blurb}
        </p>
        {user && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            You&apos;re signed in as {user.name} ({user.role}). Signing in here
            switches account.
          </p>
        )}

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            login.mutate({ email, password })
          }}
        >
          <div>
            <label
              htmlFor="email"
              className="eyebrow block text-muted-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-3 text-[15px] focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="eyebrow block text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-3 text-[15px] focus:border-primary"
            />
          </div>

          {login.isError && (
            <p
              role="alert"
              className="rounded-sm bg-destructive/10 p-3 text-[13px] text-destructive"
            >
              {login.error instanceof ApiError
                ? login.error.message
                : 'Could not sign in.'}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className={cn(
              'w-full rounded-full bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground',
              'transition-colors duration-200 hover:bg-primary-dark disabled:opacity-60',
            )}
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <Link
        to="/login"
        className="mt-5 block text-center text-[13px] text-muted-foreground underline-offset-4 hover:underline"
      >
        Not {cfg.title.toLowerCase()}? Choose another sign-in
      </Link>
    </Frame>
  )
}

function Frame({ children }) {
  return (
    <div className="grid min-h-dvh place-items-center py-16">
      <Container className="max-w-[460px]">
        <Link to="/" className="flex items-baseline justify-center gap-2.5">
          <span className="font-display text-[30px] leading-none">
            {BRAND.name}
          </span>
          <span className="eyebrow text-muted-foreground">{BRAND.city}</span>
        </Link>
        {children}
      </Container>
    </div>
  )
}
