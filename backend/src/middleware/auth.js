import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { authPayloadSchema } from '../shared/index.js'
import {
  Session,
  endSession as deleteSession,
  findSession,
} from '../models/Session.js'

export const AUTH_COOKIE = 'he_token'

const sessionMs = () => config.sessionTtlHours * 60 * 60 * 1000

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.cookieSameSite,
    path: '/',
  }
}

/** Starts a server-side session and sets the cookie that points at it. */
export async function startSession(res, user) {
  const session = await Session.create({
    user: user._id,
    role: user.role,
    expiresAt: new Date(Date.now() + sessionMs()),
  })
  const token = jwt.sign(
    { sub: String(user._id), role: user.role, sid: session._id },
    config.jwtSecret,
    { expiresIn: `${config.sessionTtlHours}h` },
  )
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: sessionMs() })
}

/** Ends only this browser's session; the user's other devices stay signed in. */
export async function endSession(req, res) {
  if (req.auth?.sid) await deleteSession(req.auth.sid)
  res.clearCookie(AUTH_COOKIE, cookieOptions())
}

/**
 * Populates req.auth when the cookie holds a valid token AND its session row
 * still exists. Never rejects — anything else is simply anonymous.
 */
export async function readAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) return next()

  let payload
  try {
    // verify() proves the signature only; the shape is checked too, so a token
    // from an older code version (no `sid`) is just treated as signed out.
    const parsed = authPayloadSchema.safeParse(
      jwt.verify(token, config.jwtSecret),
    )
    if (!parsed.success) return next()
    payload = parsed.data
  } catch {
    return next() // expired or tampered
  }

  try {
    const session = await findSession(payload.sid)
    if (
      session &&
      String(session.user) === payload.sub &&
      session.role === payload.role &&
      session.expiresAt > new Date()
    ) {
      req.auth = payload
    }
    next()
  } catch (err) {
    next(err)
  }
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
 * A logged-in chef or driver hitting an admin route must get 403 (CLAUDE.md §10).
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
