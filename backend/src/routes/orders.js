import { Router } from 'express'
import {
  DELIVERY_FEE,
  FREE_DELIVERY_ABOVE,
  PACKAGING_FEE,
  SOCKET_EVENTS,
  cancelOrderSchema,
  canTransition,
  placeOrderSchema,
                   
} from '../../../shared/index.js'
import { Dish, resetStaleSoldOut, todayKey } from '../models/Dish.js'
import { Order, generateOrderNumber } from '../models/Order.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { toOrder } from '../serialize.js'
import { emit } from '../realtime.js'

export const ordersRouter = Router()

function stamp(status             ) {
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
  validate(placeOrderSchema),
  asyncRoute(async (req, res) => {
    await resetStaleSoldOut()

    const { items, address, notes } = req.body
    const dishes = await Dish.find({ _id: { $in: items.map((i                    ) => i.dishId) } })

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
    const orderItems = items.map((i                                 ) => {
      const dish = byId.get(i.dishId) 
      return { dishId: dish._id, name: dish.name, price: dish.price, qty: i.qty }
    })

    const subtotal = orderItems.reduce(
      (sum        , i                                ) => sum + i.price * i.qty,
      0,
    )
    const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE
    const packaging = PACKAGING_FEE

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: req.auth?.sub, // undefined for guests

      items: orderItems,
      subtotal,
      deliveryFee,
      packaging,
      total: subtotal + deliveryFee + packaging,
      address,
      notes: notes ?? '',
      status: 'placed',
      timeline: [stamp('placed')],
    })

    emit(SOCKET_EVENTS.orderCreated, { order: toOrder(order) })
    res.status(201).json({ order: toOrder(order) })
  }),
)

/* ==========================================================================
   Reads — each role sees only what it is entitled to
   ========================================================================= */

/**
 * Public order tracking by order number.
 *
 * The tracking design says "type the order number on the site to see where your
 * food is", so this is intentionally unauthenticated.
 *
 * ⚠️ PRIVACY TRADE-OFF: order numbers are 4 digits (HE-4821), so a determined
 * person could enumerate them and read a customer's name, phone and address.
 * Acceptable for a prototype; before going live either lengthen the order number
 * or require the phone's last 4 digits as a second factor. Flagged in CLAUDE.md.
 */
ordersRouter.get(
  '/track/:orderNumber',
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({
      orderNumber: String(req.params.orderNumber).toUpperCase(),
    })
    if (!order) {
      res.status(404).json({ error: 'No order with that number. Check the digits and try again.' })
      return
    }
    res.json({ order: toOrder(order) })
  }),
)

/** A customer's own orders. Never anyone else's. */
ordersRouter.get(
  '/mine',
  requireAuth,
  asyncRoute(async (req, res) => {
    const orders = await Order.find({ customerId: req.auth .sub }).sort({ createdAt: -1 })
    res.json({ orders: orders.map(toOrder) })
  }),
)

/** The kitchen queue: active tickets only. No revenue, no counts (CLAUDE.md §7). */
ordersRouter.get(
  '/kitchen',
  requireRole('chef', 'admin'),
  asyncRoute(async (_req, res) => {
    // 'placed' is included so the kitchen can SEE what is coming before admin
    // accepts it — but the Ready button stays disabled until it is 'preparing'.
    const orders = await Order.find({ status: { $in: ['placed', 'preparing', 'ready'] } }).sort({
      createdAt: 1, // oldest first — the kitchen works the queue in order
    })
    res.json({ orders: orders.map(toOrder) })
  }),
)

/** Admin-only: every order. This is the monitoring surface. */
ordersRouter.get(
  '/',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const status = req.query.status;                          
    const filter = status ? { status } : {}
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json({ orders: orders.map(toOrder) })
  }),
)

/** Admin-only: revenue monitoring. */
ordersRouter.get(
  '/stats',
  requireRole('admin'),
  asyncRoute(async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 })
    const earned = orders.filter((o) => o.status === 'delivered')
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const isToday = (o                         ) =>
      (o                                  ).createdAt >= startOfToday

    const sum = (list               ) => list.reduce((s, o) => s + o.total, 0)

    // Revenue by dish, from delivered orders only.
    const byDish = new Map                                                        ()
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
    const daily                                      = []
    for (let d = 6; d >= 0; d--) {
      const day = new Date()
      day.setDate(day.getDate() - d)
      const key = day.toLocaleDateString('en-CA')
      daily.push({
        date: key,
        revenue: sum(
          earned.filter(
            (o) =>
              (o                                  ).createdAt.toLocaleDateString('en-CA') === key,
          ),
        ),
      })
    }

    res.json({
      todayRevenue: sum(earned.filter(isToday)),
      todayOrders: orders.filter(isToday).length,
      pending: orders.filter((o) => o.status === 'placed').length,
      inKitchen: orders.filter((o) => o.status === 'preparing').length,
      averageOrderValue: earned.length ? Math.round(sum(earned) / earned.length) : 0,
      lostToCancellations: sum(orders.filter((o) => o.status === 'cancelled')),
      daily,
      topDishes: [...byDish.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    })
  }),
)

/** Single order. Customers may read only their own. */
ordersRouter.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404).json({ error: 'Order not found.' })
      return
    }
    const isOwner = String(order.customerId) === req.auth .sub
    const isStaff = req.auth .role === 'admin' || req.auth .role === 'chef'
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'You do not have access to this order.' })
      return
    }
    res.json({ order: toOrder(order) })
  }),
)

/* ==========================================================================
   Transitions — the state machine (CLAUDE.md §5)
   ========================================================================= */

async function transition(id        , to             ) {
  const order = await Order.findById(id)
  if (!order) return { error: 'notfound'          }

  const from = order.status;              
  if (!canTransition(from, to)) {
    return { error: 'illegal'         , from, to }
  }

  order.status = to
  order.timeline.push(stamp(to))
  await order.save()
  return { order }
}

function respond(
  res                            ,
  result                                        ,
) {
  if ('error' in result) {
    if (result.error === 'notfound') {
      res.status(404).json({ error: 'Order not found.' })
    } else {
      res.status(409).json({
        error: `Cannot move an order from ${result.from} to ${result.to}.`,
      })
    }
    return
  }
  emit(SOCKET_EVENTS.orderUpdated, { order: toOrder(result.order) })
  res.json({ order: toOrder(result.order) })
}

/** Admin accepts → the order enters PREPARING automatically and hits the kitchen. */
ordersRouter.post(
  '/:id/accept',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    respond(res, await transition(String(req.params.id),'preparing'))
  }),
)

/** The chef's single button. */
ordersRouter.post(
  '/:id/ready',
  requireRole('chef', 'admin'),
  asyncRoute(async (req, res) => {
    respond(res, await transition(String(req.params.id),'ready'))
  }),
)

/** Admin closes the order out. */
ordersRouter.post(
  '/:id/deliver',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    respond(res, await transition(String(req.params.id),'delivered'))
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

    const from = order.status;              
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
    const validSoldOut = (soldOutDishIds            ).filter((id) => orderDishIds.has(id))

    order.status = 'cancelled'
    order.timeline.push(stamp('cancelled'))
    order.cancellation = { reason, soldOutDishIds: validSoldOut          }
    await order.save()

    if (validSoldOut.length > 0) {
      await Dish.updateMany(
        { _id: { $in: validSoldOut } },
        { $set: { availableToday: false, soldOutOn: todayKey() } },
      )
      const updated = await Dish.find({ _id: { $in: validSoldOut } })
      for (const d of updated) {
        emit(SOCKET_EVENTS.menuUpdated, { dish: { id: String(d._id), availableToday: false } })
      }
    }

    emit(SOCKET_EVENTS.orderUpdated, { order: toOrder(order) })
    res.json({ order: toOrder(order) })
  }),
)
