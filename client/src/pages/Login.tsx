import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { BRAND } from '@shared/index'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { Container } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/**
 * Staff sign-in. No design was supplied for this screen, so it is built from the
 * existing token system to match everything else.
 *
 * There is deliberately no "create account" link: the admin and chef accounts are
 * seeded server-side and cannot be registered (CLAUDE.md §10).
 */
export default function Login() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess: ({ user }) => {
      setUser(user)
      navigate(user.role === 'chef' ? '/kitchen' : '/admin', { replace: true })
    },
  })

  if (user) return <Navigate to={user.role === 'chef' ? '/kitchen' : '/admin'} replace />

  return (
    <div className="grid min-h-dvh place-items-center py-16">
      <Container className="max-w-[460px]">
        <Link to="/" className="flex items-baseline justify-center gap-2.5">
          <span className="font-display text-[30px] leading-none">{BRAND.name}</span>
          <span className="eyebrow text-muted-foreground">{BRAND.city}</span>
        </Link>

        <div className="mt-10 rounded-md border border-border bg-surface p-8">
          <p className="eyebrow text-muted-foreground">Staff sign in</p>
          <h1 className="mt-3 text-[30px]">Kitchen &amp; admin</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Customers don&apos;t need an account — ordering is guest checkout.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              login.mutate({ email, password })
            }}
          >
            <div>
              <label htmlFor="email" className="eyebrow block text-muted-foreground">
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
              <label htmlFor="password" className="eyebrow block text-muted-foreground">
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
              <p role="alert" className="rounded-sm bg-destructive/10 p-3 text-[13px] text-destructive">
                {login.error instanceof ApiError ? login.error.message : 'Could not sign in.'}
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

        {/* Prototype convenience — remove before this is exposed publicly. */}
        <div className="mt-6 rounded-md border border-dashed border-border p-5 text-[13px]">
          <p className="eyebrow text-muted-foreground">Demo accounts</p>
          <ul className="mt-3 space-y-1.5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Admin</strong> · admin@healthyeats.in / admin123
            </li>
            <li>
              <strong className="text-foreground">Chef</strong> · chef@healthyeats.in / chef123
            </li>
          </ul>
        </div>
      </Container>
    </div>
  )
}
