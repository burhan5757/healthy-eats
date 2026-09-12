import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { authPayloadSchema } from '../../../shared/index.js'

export const AUTH_COOKIE = 'he_token'

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
  })
}

/** Populates req.auth when a valid token is present. Never rejects. */
export function readAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (token) {
    try {
      // jwt.verify only proves the signature; it says nothing about the shape
      // of the decoded payload. Validate it too — a stale token from an older
      // code version could otherwise carry a different claim shape and leave
      // req.auth.role silently undefined.
      const parsed = authPayloadSchema.safeParse(jwt.verify(token, config.jwtSecret))
      if (parsed.success) {
        req.auth = parsed.data
      }
    } catch {
      /* expired or tampered — treat as anonymous */
    }
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.auth) {
    res.status(401).json({ error: 'You need to be signed in.' })
    return
  }
  next()
}

/**
 * Role gate. This is the real enforcement — hiding UI is not access control.
 * A logged-in chef or customer hitting an admin route must get 403 (CLAUDE.md §10).
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: 'You need to be signed in.' })
      return
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'You do not have access to this.' })
      return
    }
    next()
  }
}
