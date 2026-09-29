import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { authPayloadSchema } from '../shared/index.js'
import {
  Session,
  endSession as deleteSession,
  findSession,
} from '../models/Session.js'

/**
 * One cookie PER STAFF ROLE, not one shared cookie. Signing into admin, chef
 * and driver all in the same browser used to overwrite a single `he_token`
 * cookie, so the second login silently signed the first one out ("switches
 * account" in the login copy). Each role now gets its own cookie, so all
 * three can be signed in at once — e.g. an admin tab and a driver tab open
 * side by side.
 */
export const ROLE_COOKIE = {
  admin: 'he_token_admin',
  chef: 'he_token_chef',
  driver: 'he_token_driver',
}
const STAFF_ROLES = Object.keys(ROLE_COOKIE)

/**
 * Which role a request is acting as. The frontend sends this explicitly (each
 * screen — /admin, /kitchen, /driver — knows its own role), so two tabs never
 * interfere with each other even when both cookies are valid at once. Ends up
 * here.
 */
export const ROLE_HEADER = 'x-healthy-eats-role'

/**
 * Non-sensitive hint cookie: "the role most recently signed into in this
 * browser." Used only as a fallback when a caller doesn't send ROLE_HEADER
 * (e.g. a script hitting the API directly) — it lets that caller keep
 * behaving like there's a single signed-in identity, same as before this
 * change, without forcing every caller to learn about per-role cookies.
 */
const ROLE_HINT_COOKIE = 'he_active_role'

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
  const opts = { ...cookieOptions(), maxAge: sessionMs() }
  res.cookie(ROLE_COOKIE[user.role], token, opts)
  res.cookie(ROLE_HINT_COOKIE, user.role, opts)
}

/** Ends only this browser's session for this role; other roles and other devices stay signed in. */
export async function endSession(req, res) {
  if (req.auth?.sid) await deleteSession(req.auth.sid)
  if (req.auth?.role) {
    res.clearCookie(ROLE_COOKIE[req.auth.role], cookieOptions())
  }
}

/**
 * Populates req.auth when the resolved role's cookie holds a valid token AND
 * its session row still exists. Never rejects — anything else is simply
 * anonymous. The role to check is ROLE_HEADER when the caller sent one
 * (matched against STAFF_ROLES so a bogus value can't be used to probe
 * cookies that don't exist), else the ROLE_HINT_COOKIE fallback above.
 */
export async function readAuth(req, _res, next) {
  const headerRole = req.headers[ROLE_HEADER]
  const hintRole = req.cookies?.[ROLE_HINT_COOKIE]
  const role = STAFF_ROLES.includes(headerRole)
    ? headerRole
    : STAFF_ROLES.includes(hintRole)
      ? hintRole
      : null
  const token = role ? req.cookies?.[ROLE_COOKIE[role]] : null
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
