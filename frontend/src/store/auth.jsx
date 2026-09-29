import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, setStaffRole } from '@/lib/api'

/**
 * Staff session. Customers never log in — checkout is guest-only (CLAUDE.md §10a) —
 * so this exists purely for staff: the single admin, the single chef, and drivers.
 *
 * The token itself lives in an httpOnly cookie the JS cannot read; this only
 * mirrors *who* is signed in so routes can render the right thing. Every actual
 * permission decision is still made server-side.
 *
 * Each staff area has its own cookie on the backend (one per role), so an
 * admin tab and a driver tab can be signed in at once in the same browser —
 * logging into one no longer signs the others out. Which cookie applies to a
 * given screen is read off the URL: /admin acts as admin, /kitchen as chef
 * (falling back to admin, since admin may also view the kitchen screen), and
 * /driver as driver. Whichever role resolves is what every subsequent API
 * call from that screen acts as (lib/api.js's X-Healthy-Eats-Role header).
 */

const AuthContext = createContext(null)

function rolesForPath(pathname) {
  if (pathname.startsWith('/admin')) return ['admin']
  if (pathname.startsWith('/kitchen/login')) return ['chef']
  if (pathname.startsWith('/kitchen')) return ['chef', 'admin']
  if (pathname.startsWith('/driver')) return ['driver']
  return []
}

export function AuthProvider({ children }) {
  const location = useLocation()
  const roles = rolesForPath(location.pathname)
  const rolesKey = roles.join(',')
  const [user, setUserState] = useState(null)
  const [loading, setLoading] = useState(roles.length > 0)

  useEffect(() => {
    if (roles.length === 0) {
      setStaffRole(null)
      setUserState(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      for (const role of roles) {
        try {
          const { user } = await api.auth.me(role)
          if (!cancelled) {
            setStaffRole(role)
            setUserState(user)
          }
          return
        } catch {
          // Not signed in as this role — try the next candidate.
        }
      }
      if (!cancelled) {
        setStaffRole(null)
        setUserState(null)
      }
    })().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesKey])

  /** Used right after a successful login — we already know both the user and
   *  the role they signed into, no need to re-probe. */
  const setUser = (nextUser) => {
    setStaffRole(nextUser?.role ?? null)
    setUserState(nextUser)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      logout: async () => {
        await api.auth.logout().catch(() => {})
        setStaffRole(null)
        setUserState(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role))
}
