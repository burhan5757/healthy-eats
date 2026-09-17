import { Router } from 'express'
import mongoose from 'mongoose'
import {
  SOCKET_EVENTS,
  assignDriverSchema,
  cancelOrderSchema,
  BRAND,
  canTransition,
  dayKey,
  isOpenAt,
  orderTotals,
  placeOrderSchema,
} from '../shared/index.js'
import { Dish, resetStaleSoldOut, todayKey } from '../models/Dish.js'
import {
  ORDER_NUMBER_PATTERN,
  Order,
  generateOrderNumber,
} from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { recordCustomerOrder } from '../models/Customer.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import { requireRole } from '../middleware/auth.js'
import { placeOrderLimiter, trackLimiter } from '../middleware/rateLimit.js'
import { User } from '../models/User.js'
import { toOrder, toPublicOrder } from '../serialize.js'
import { emit } from '../realtime.js'
import { invalidateMenu } from '../menuCache.js'
import { config } from '../config.js'

/** Whether the kitchen is taking orders right now — the server's word on it. */
export function orderingStatus() {
  const { open, lastOrder } = BRAND.orderingHours
  return {
    open: !config.enforceOrderingHours || isOpenAt(),
    opensAt: open,
    lastOrderAt: lastOrder,
  }
}

/** Bulk-attaches payments to a list of orders — one query, not N. */
async function withPayments(orders) {
  const payments = await Payment.find({
    order: { $in: orders.map((o) => o._id) },
  })
  const byOrder = new Map(payments.map((p) => [String(p.order), p]))
  return orders.map((o) => toOrder(o, byOrder.get(String(o._id))))
}

export const ordersRouter = Router()

// A malformed :id is simply "not found" — never a CastError 500.
ordersRouter.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }
  next()
})

function stamp(status) {
  return { status, at: new Date().toISOString() }
}

/* ==========================================================================
   Customer — place an order
   ========================================================================= */

/**
 * Guest checkout — deliberately NO auth. The checkout design reads
 * "NO ACCOUNT NEEDED" (CLAUDE.md §10a). Identity is the name and phone on the
 * address; the order number is what the customer keeps.
 */
ordersRouter.post(
  '/',
  placeOrderLimiter,
  validate(placeOrderSchema),
  asyncRoute(async (req, res) => {
    const status = orderingStatus()
    if (!status.open) {
      res.status(409).json({
        error: `We're closed right now. Orders open at ${status.opensAt}; last order ${status.lastOrderAt}.`,
      })
      return
    }

    await resetStaleSoldOut()

    const { items, address, notes } = req.body
    const dishes = await Dish.find({ _id: { $in: items.map((i) => i.dishId) } })

    if (dishes.length !== items.length) {
      res.status(400).json({ error: 'One of those dishes no longer exists.' })
      return
    }

    const soldOut = dishes.filter((d) => !d.availableToday)
    if (soldOut.length > 0) {
      res.status(409).json({
        error: `${soldOut.map((d) => d.name).join(', ')} sold out today. Please remove it and try again.`,
        soldOutDishIds: soldOut.map((d) => String(d._id)),
      })
      return
    }

    // Totals are computed from the database, never from the client payload.
    const byId = new Map(dishes.map((d) => [String(d._id), d]))
    const orderItems = items.map((i) => {
      const dish = byId.get(i.dishId)
      return {
        dishId: dish._id,
        name: dish.name,
        price: dish.price,
        qty: i.qty,
      }
    })

    // Delivery is ₹10 per started km from the kitchen to the (required) pin.
    const { subtotal, deliveryFee, packaging, total } = orderTotals(
      orderItems,
      address,
    )

    const customer = await recordCustomerOrder(address)

    const order = await createWithUniqueNumber({
      customerId: req.auth?.sub, // undefined for guests
      customer: customer._id,

      items: orderItems,
      subtotal,
      deliveryFee,
      packaging,
      total,
      address,
      notes: notes ?? '',
      status: 'placed',
      timeline: [stamp('placed')],
    })

    let payment
    try {
      payment = await Payment.create({
        order: order._id,
        orderNumber: order.orderNumber,
        method: 'cod',
        amount: total,
        status: 'pending',
      })
    } catch (err) {
      await Order.deleteOne({ _id: order._id })
      throw err
    }

    emit(SOCKET_EVENTS.orderCreated)
    res.status(201).json({ order: toPublicOrder(order) })
  }),
)

/** A collision in 10^12 is vanishingly rare, but the unique index would 500 on one. */
async function createWithUniqueNumber(fields) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await Order.create({
        ...fields,
        orderNumber: generateOrderNumber(),
      })
    } catch (err) {
      if (err?.code !== 11000 || attempt >= 4) throw err
    }
  }
}

/* ==========================================================================
   Reads — each role sees only what it is entitled to
   ========================================================================= */

/**
 * Public order tracking by order number.
 *
 * The tracking design says "type the order number on the site to see where your
 * food is", so this is intentionally unauthenticated. The order number is
 * therefore treated as a bearer secret: it is 8 CSPRNG characters (not
 * guessable), and the response is the stripped public shape (CLAUDE.md §10b).
 */
ordersRouter.get(
  '/track/:orderNumber',
  trackLimiter,
  asyncRoute(async (req, res) => {
    const orderNumber = String(req.params.orderNumber).toUpperCase()
    const order = ORDER_NUMBER_PATTERN.test(orderNumber)
      ? await Order.findOne({ orderNumber })
      : null
    if (!order) {
      res.status(404).json({
        error: 'No order with that number. Check it and try again.',
      })
      return
    }
    res.json({ order: toPublicOrder(order) })
  }),
)

/** The kitchen queue: active tickets only. No revenue, no counts (CLAUDE.md §7). */
ordersRouter.get(
  '/kitchen',
  requireRole('chef', 'admin'),
  asyncRoute(async (_req, res) => {
    // 'placed' is included so the kitchen can SEE what is coming before admin
    // accepts it — but the Ready button stays disabled until it is 'preparing'.
    const orders = await Order.find({
      status: { $in: ['placed', 'preparing', 'ready'] },
    }).sort({
      createdAt: 1, // oldest first — the kitchen works the queue in order
    })
    res.json({ orders: orders.map((o) => toOrder(o)) })
  }),
)

/**
 * The driver's queue: READY orders assigned to this driver, oldest first.
 * Operational only — no payment ledger, no counts (CLAUDE.md §7). The order
 * total is on each order because the driver collects the cash.
 */
ordersRouter.get(
  '/driver',
  requireRole('driver'),
  asyncRoute(async (req, res) => {
    const orders = await Order.find({
      'driver.user': req.auth.sub,
      status: 'ready',
    }).sort({ createdAt: 1 })
    res.json({ orders: orders.map((o) => toOrder(o)) })
  }),
)

/** Admin-only: every order. This is the monitoring surface. */
ordersRouter.get(
  '/',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const status = req.query.status
    const filter = status ? { status } : {}
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json({ orders: await withPayments(orders) })
  }),
)

/** Admin-only: revenue monitoring. */
ordersRouter.get(
  '/stats',
  requireRole('admin'),
  asyncRoute(async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 })
    const earned = orders.filter((o) => o.status === 'delivered')
    // "Today" is the kitchen's day (IST), whatever zone the server runs in.
    const today = dayKey()
    const isToday = (o) => dayKey(o.createdAt) === today

    const sum = (list) => list.reduce((s, o) => s + o.total, 0)

    // Revenue by dish, from delivered orders only.
    const byDish = new Map()
    for (const o of earned) {
      for (const i of o.items) {
        const key = String(i.dishId)
        const row = byDish.get(key) ?? { name: i.name, qty: 0, revenue: 0 }
        row.qty += i.qty
        row.revenue += i.price * i.qty
        byDish.set(key, row)
      }
    }

    // Last 7 days of delivered revenue, oldest first.
    const daily = []
    for (let d = 6; d >= 0; d--) {
      const key = dayKey(new Date(Date.now() - d * 24 * 60 * 60 * 1000))
      daily.push({
        date: key,
        revenue: sum(earned.filter((o) => dayKey(o.createdAt) === key)),
      })
    }

    res.json({
      todayRevenue: sum(earned.filter(isToday)),
      todayOrders: orders.filter(isToday).length,
      pending: orders.filter((o) => o.status === 'placed').length,
      inKitchen: orders.filter((o) => o.status === 'preparing').length,
      averageOrderValue: earned.length
        ? Math.round(sum(earned) / earned.length)
        : 0,
      lostToCancellations: sum(orders.filter((o) => o.status === 'cancelled')),
      daily,
      topDishes: [...byDish.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
    })
  }),
)

/**
 * Single order, staff only. A driver may read only orders assigned to them.
 * The payment ledger is admin-only money data (CLAUDE.md §7).
 */
ordersRouter.get(
  '/:id',
  requireRole('admin', 'chef', 'driver'),
  asyncRoute(async (req, res) => {
    const order = mongoose.isValidObjectId(req.params.id)
      ? await Order.findById(req.params.id)
      : null
    if (!order) {
      res.status(404).json({ error: 'Order not found.' })
      return
    }
    if (req.auth.role === 'driver' && !isDriverOf(order, req.auth.sub)) {
      res.status(403).json({ error: 'You do not have access to this order.' })
      return
    }
    const payment =
      req.auth.role === 'admin'
        ? await Payment.findOne({ order: order._id })
        : undefined
    res.json({ order: toOrder(order, payment) })
  }),
)

/* ==========================================================================
   Transitions — the state machine (CLAUDE.md §5)
   ========================================================================= */

function isDriverOf(order, userId) {
  return Boolean(order.driver) && String(order.driver.user) === userId
}

/** `guard(order)` may veto the move with `{ error: 'denied' | 'conflict', message }`. */
async function transition(id, to, guard) {
  const order = await Order.findById(id)
  if (!order) return { error: 'notfound' }

  const from = order.status
  if (!canTransition(from, to)) {
    return { error: 'illegal', from, to }
  }
  const veto = guard?.(order)
  if (veto) return veto

  order.status = to
  order.timeline.push(stamp(to))
  await order.save()
  return { order }
}

function respond(res, result, payment) {
  if ('error' in result) {
    if (result.error === 'notfound') {
      res.status(404).json({ error: 'Order not found.' })
    } else if (result.error === 'denied') {
      res.status(403).json({ error: result.message })
    } else if (result.error === 'conflict') {
      res.status(409).json({ error: result.message })
    } else {
      res.status(409).json({
        error: `Cannot move an order from ${result.from} to ${result.to}.`,
      })
    }
    return
  }
  emit(SOCKET_EVENTS.orderUpdated)
  res.json({ order: toOrder(result.order, payment) })
}

/** Admin accepts → the order enters PREPARING automatically and hits the kitchen. */
ordersRouter.post(
  '/:id/accept',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    respond(res, await transition(String(req.params.id), 'preparing'))
  }),
)

/** The chef's single button. */
ordersRouter.post(
  '/:id/ready',
  requireRole('chef', 'admin'),
  asyncRoute(async (req, res) => {
    respond(res, await transition(String(req.params.id), 'ready'))
  }),
)

/**
 * Admin assigns (or, with `driverId: null`, unassigns) a driver. READY orders only.
 * Reassigning clears any earlier acceptance — the new driver must accept afresh.
 */
ordersRouter.post(
  '/:id/assign',
  requireRole('admin'),
  validate(assignDriverSchema),
  asyncRoute(async (req, res) => {
    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404).json({ error: 'Order not found.' })
      return
    }
    if (order.status !== 'ready') {
      res.status(409).json({
        error: 'A driver can only be assigned once the order is ready.',
      })
      return
    }

    const { driverId } = req.body
    if (driverId === null) {
      order.driver = undefined
    } else {
      const driver = mongoose.isValidObjectId(driverId)
        ? await User.findOne({ _id: driverId, role: 'driver', active: true })
        : null
      if (!driver) {
        res.status(400).json({ error: 'That is not an active driver.' })
        return
      }
      order.driver = {
        user: driver._id,
        name: driver.name,
        assignedAt: new Date(),
      }
    }
    await order.save()

    const payment = await Payment.findOne({ order: order._id })
    emit(SOCKET_EVENTS.orderUpdated)
    res.json({ order: toOrder(order, payment) })
  }),
)

/** The driver takes the job. Not a status change — the order stays READY. */
ordersRouter.post(
  '/:id/driver-accept',
  requireRole('driver'),
  asyncRoute(async (req, res) => {
    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404).json({ error: 'Order not found.' })
      return
    }
    if (!isDriverOf(order, req.auth.sub)) {
      res.status(403).json({ error: 'This order is not assigned to you.' })
      return
    }
    if (order.status !== 'ready' || order.driver.acceptedAt) {
      res.status(409).json({ error: 'This order can no longer be accepted.' })
      return
    }
    order.driver.acceptedAt = new Date()
    await order.save()

    emit(SOCKET_EVENTS.orderUpdated)
    res.json({ order: toOrder(order) })
  }),
)

/**
 * Closes the order out — this is also when COD cash is collected.
 * An assigned order can only be closed by its driver, after accepting it;
 * admin closes out only orders with no driver.
 */
ordersRouter.post(
  '/:id/deliver',
  requireRole('admin', 'driver'),
  asyncRoute(async (req, res) => {
    const isDriver = req.auth.role === 'driver'
    const result = await transition(
      String(req.params.id),
      'delivered',
      (order) => {
        if (isDriver) {
          if (!isDriverOf(order, req.auth.sub)) {
            return {
              error: 'denied',
              message: 'This order is not assigned to you.',
            }
          }
          if (!order.driver.acceptedAt) {
            return {
              error: 'conflict',
              message: 'Accept the order before marking it delivered.',
            }
          }
        } else if (order.driver) {
          return {
            error: 'conflict',
            message: `Assigned to ${order.driver.name} — the driver closes it out.`,
          }
        }
        return null
      },
    )
    let payment
    if (!('error' in result)) {
      payment = await Payment.findOneAndUpdate(
        { order: result.order._id },
        {
          $set: {
            status: 'collected',
            collectedAt: new Date(),
            collectedBy: req.auth.sub,
          },
        },
        { returnDocument: 'after' },
      )
    }
    respond(res, result, payment)
  }),
)

/**
 * Admin cancels — and picks which dish(es) ran out.
 * Those dishes go "Unavailable today" on the public menu and reset next day.
 * This is the user's definition of cancel (CLAUDE.md §3).
 */
ordersRouter.post(
  '/:id/cancel',
  requireRole('admin'),
  validate(cancelOrderSchema),
  asyncRoute(async (req, res) => {
    const { reason, soldOutDishIds } = req.body

    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404).json({ error: 'Order not found.' })
      return
    }

    const from = order.status
    if (!canTransition(from, 'cancelled')) {
      res.status(409).json({
        error:
          from === 'ready'
            ? 'This order is already cooked and ready — it cannot be cancelled.'
            : `Cannot cancel an order that is already ${from}.`,
      })
      return
    }

    // Only dishes actually in this order may be marked sold out.
    const orderDishIds = new Set(order.items.map((i) => String(i.dishId)))
    const validSoldOut = soldOutDishIds.filter((id) => orderDishIds.has(id))

    order.status = 'cancelled'
    order.timeline.push(stamp('cancelled'))
    order.cancellation = { reason, soldOutDishIds: validSoldOut }
    await order.save()

    const payment = await Payment.findOneAndUpdate(
      { order: order._id },
      { $set: { status: 'void', voidedAt: new Date() } },
      { returnDocument: 'after' },
    )

    if (validSoldOut.length > 0) {
      await Dish.updateMany(
        { _id: { $in: validSoldOut } },
        { $set: { availableToday: false, soldOutOn: todayKey() } },
      )
      invalidateMenu()
      const updated = await Dish.find({ _id: { $in: validSoldOut } })
      for (const d of updated) {
        emit(SOCKET_EVENTS.menuUpdated, {
          dish: { id: String(d._id), availableToday: false },
        })
      }
    }

    emit(SOCKET_EVENTS.orderUpdated)
    res.json({ order: toOrder(order, payment) })
  }),
)
