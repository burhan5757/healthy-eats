import { Router } from 'express'
import { loginSchema, registerSchema } from '../../../shared/index.js'
import { User, hashPassword } from '../models/User.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js'
import { toPublicUser } from '../serialize.js'

export const authRouter = Router()

/**
 * Registration ALWAYS creates a customer. There is deliberately no way to
 * register as chef or admin — those accounts exist only via the seed script.
 * `role` is never read from the request body (CLAUDE.md §10).
 */
authRouter.post(
  '/register',
  validate(registerSchema),
  asyncRoute(async (req, res) => {
    const { name, email, password } = req.body

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' })
      return
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: 'customer',
    })

    setAuthCookie(res, signToken({ sub: String(user._id), role: 'customer' }))
    res.status(201).json({ user: toPublicUser(user) })
  }),
)

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncRoute(async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })
    // Same message either way — don't reveal which accounts exist.
    if (!user || !(await user.verifyPassword(password))) {
      res.status(401).json({ error: 'Incorrect email or password.' })
      return
    }

    setAuthCookie(res, signToken({ sub: String(user._id), role: user.role          }))
    res.json({ user: toPublicUser(user) })
  }),
)

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

authRouter.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.auth .sub)
    if (!user) {
      clearAuthCookie(res)
      res.status(401).json({ error: 'Session no longer valid.' })
      return
    }
    res.json({ user: toPublicUser(user) })
  }),
)
