import { Router } from 'express'
import mongoose from 'mongoose'
import { createDriverSchema, updateDriverSchema } from '../shared/index.js'
import { User, hashPassword } from '../models/User.js'
import { endSessionsFor } from '../models/Session.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import { requireRole } from '../middleware/auth.js'
import { toPublicUser } from '../serialize.js'

/**
 * Driver accounts — admin only. This is the ONLY way a driver account comes to
 * exist, and `role` is hardcoded here, never read from the body (CLAUDE.md §10).
 */
export const driversRouter = Router()

driversRouter.use(requireRole('admin'))

driversRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const drivers = await User.find({ role: 'driver' }).sort({ name: 1 })
    res.json({ drivers: drivers.map(toPublicUser) })
  }),
)

driversRouter.post(
  '/',
  validate(createDriverSchema),
  asyncRoute(async (req, res) => {
    const { name, phone, email, password } = req.body
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      res
        .status(409)
        .json({ error: 'An account with this email already exists.' })
      return
    }
    const driver = await User.create({
      name,
      phone,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: 'driver',
      active: true,
    })
    res.status(201).json({ driver: toPublicUser(driver) })
  }),
)

driversRouter.patch(
  '/:id',
  validate(updateDriverSchema),
  asyncRoute(async (req, res) => {
    const driver = mongoose.isValidObjectId(req.params.id)
      ? await User.findOneAndUpdate(
          { _id: req.params.id, role: 'driver' },
          { $set: { active: req.body.active } },
          { returnDocument: 'after' },
        )
      : null
    if (!driver) {
      res.status(404).json({ error: 'Driver not found.' })
      return
    }
    // Deactivation signs the driver out everywhere, immediately.
    if (!driver.active) await endSessionsFor(driver._id)
    res.json({ driver: toPublicUser(driver) })
  }),
)
