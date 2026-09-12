import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { Container } from '@/components/ui/primitives'

/**
 * Client-side route guard.
 *
 * This is CONVENIENCE ONLY — it stops the wrong screen rendering, nothing more.
 * The real enforcement is the server's role middleware, which 403s a chef or a
 * customer hitting an admin endpoint regardless of what the browser does
 * (CLAUDE.md §10).
 */
export function RequireRole({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Container className="py-32 text-center text-muted-foreground">
        Checking access…
      </Container>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (!roles.includes(user.role)) {
    return (
      <Container className="py-32 text-center">
        <p className="eyebrow text-muted-foreground">Not permitted</p>
        <h1 className="mt-4 text-4xl">This area isn&apos;t yours</h1>
        <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
          You&apos;re signed in as {user.name} ({user.role}). Only the admin
          account can open the monitoring dashboard.
        </p>
      </Container>
    )
  }

  return <Outlet />
}
