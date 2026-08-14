import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import type { Role } from '../../../shared/index.js'

export const AUTH_COOKIE = 'he_token'

export type AuthPayload = { sub: string; role: Role }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
  })
}

/** Populates req.auth when a valid token is present. Never rejects. */
export function readAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE]
  if (token) {
    try {
      req.auth = jwt.verify(token, config.jwtSecret) as AuthPayload
    } catch {
      /* expired or tampered — treat as anonymous */
    }
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
