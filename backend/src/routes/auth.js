import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { loginSchema } from '../shared/index.js'
import { User } from '../models/User.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import {
  endSession,
  requireAuth,
  startSession,
} from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import { toPublicUser } from '../serialize.js'

/**
 * Staff sign-in only. Customers never log in (guest checkout), so there is no
 * registration route at all. Admin and chef exist only via env + the seed;
 * drivers only via admin's POST /api/drivers (CLAUDE.md §10).
 */
export const authRouter = Router()

/** Cost-12 hash of a throwaway string; only ever compared against, never matched. */
const TIMING_DUMMY_HASH =
  '$2b$12$vApyuHfRvLeHyi3JNXRNZuu5YBHqJARhBfE3jnNazx7CmoVdA88Xe'

/**
 * One login endpoint per role, each accepting only its own role. A role
 * mismatch gets the same 401 as a wrong password — the response never reveals
 * that an account exists under a different role.
 */
function loginFor(role) {
  return [
    ...loginLimiter,
    validate(loginSchema),
    asyncRoute(async (req, res) => {
      const { email, password } = req.body

      const user = await User.findOne({ email: email.toLowerCase() })
      // Always pay for one bcrypt comparison, so response time doesn't reveal
      // whether the email exists or belongs to another role.
      const passwordOk =
        user && user.role === role
          ? await user.verifyPassword(password)
          : await bcrypt.compare(password, TIMING_DUMMY_HASH).then(() => false)
      if (!passwordOk) {
        res.status(401).json({ error: 'Incorrect email or password.' })
        return
      }
      if (user.active === false) {
        res.status(401).json({ error: 'This account has been deactivated.' })
        return
      }

      await startSession(res, user)
      res.json({ user: toPublicUser(user) })
    }),
  ]
}

authRouter.post('/admin/login', ...loginFor('admin'))
authRouter.post('/chef/login', ...loginFor('chef'))
authRouter.post('/driver/login', ...loginFor('driver'))

authRouter.post(
  '/logout',
  asyncRoute(async (req, res) => {
    await endSession(req, res)
    res.json({ ok: true })
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.auth.sub)
    if (!user || user.active === false) {
      await endSession(req, res)
      res.status(401).json({ error: 'Session no longer valid.' })
      return
    }
    res.json({ user: toPublicUser(user) })
  }),
)
