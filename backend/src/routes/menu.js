import { Router } from 'express'
import { z } from 'zod'
import { SOCKET_EVENTS } from '../../../shared/index.js'
import { Dish, resetStaleSoldOut, todayKey } from '../models/Dish.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import { requireRole } from '../middleware/auth.js'
import { toDish } from '../serialize.js'
import { emit } from '../realtime.js'

export const menuRouter = Router()

/** Public menu. Sold-out dishes are returned too — greyed, never hidden (CLAUDE.md §5). */
menuRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    await resetStaleSoldOut()
    const dishes = await Dish.find().sort({ sortOrder: 1, name: 1 })
    res.json({ dishes: dishes.map(toDish) })
  }),
)

menuRouter.get(
  '/:slug',
  asyncRoute(async (req, res) => {
    await resetStaleSoldOut()
    const dish = await Dish.findOne({ slug: req.params.slug })
    if (!dish) {
      res.status(404).json({ error: 'Dish not found.' })
      return
    }
    res.json({ dish: toDish(dish) })
  }),
)

/* --- Admin-only availability control -------------------------------------- */

const availabilitySchema = z.object({ availableToday: z.boolean() })

menuRouter.patch(
  '/:id/availability',
  requireRole('admin'),
  validate(availabilitySchema),
  asyncRoute(async (req, res) => {
    const dish = await Dish.findByIdAndUpdate(
      req.params.id,
      {
        availableToday: req.body.availableToday,
        soldOutOn: req.body.availableToday ? null : todayKey(),
      },
      { new: true },
    )
    if (!dish) {
      res.status(404).json({ error: 'Dish not found.' })
      return
    }
    emit(SOCKET_EVENTS.menuUpdated, { dish: toDish(dish) })
    res.json({ dish: toDish(dish) })
  }),
)
