import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Staff session. Customers never log in — checkout is guest-only (CLAUDE.md §10a) —
 * so this exists purely for the chef and the single admin account.
 *
 * The token itself lives in an httpOnly cookie the JS cannot read; this only
 * mirrors *who* is signed in so routes can render the right thing. Every actual
 * permission decision is still made server-side.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      logout: async () => {
        await api.auth.logout().catch(() => {})
        setUser(null)
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
