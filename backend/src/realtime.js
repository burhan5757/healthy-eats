import { Server } from 'socket.io'
import { config } from './config.js'
import { SOCKET_EVENTS } from './shared/index.js'
import { ORDER_NUMBER_PATTERN } from './models/Order.js'

const MAX_TRACKED_PER_SOCKET = 5
const roomFor = (orderNumber) => `order:${orderNumber}`

let io = null

/**
 * Socket.IO keeps the chef and admin screens live without polling.
 *
 * Every connected browser receives every broadcast, anonymous visitors included,
 * so order events carry NO payload — no order number, no customer details.
 * They are a bare "something changed" signal; each screen refetches through
 * its own role-guarded (or order-number-guarded) REST call (CLAUDE.md §10b).
 */
export function initRealtime(server) {
  io = new Server(server, {
    cors: { origin: config.clientOrigin, credentials: true },
  })

  io.on('connection', (socket) => {
    // A tracking page joins its own order's room. Knowing the number is the
    // same secret the REST lookup needs, and room events carry no data.
    socket.on(SOCKET_EVENTS.trackJoin, (orderNumber) => {
      if (
        typeof orderNumber !== 'string' ||
        !ORDER_NUMBER_PATTERN.test(orderNumber)
      ) {
        return
      }
      const tracked = [...socket.rooms].filter((r) => r.startsWith('order:'))
      if (tracked.length >= MAX_TRACKED_PER_SOCKET) socket.leave(tracked[0])
      socket.join(roomFor(orderNumber))
    })
  })

  console.log('[realtime] socket.io ready')
}

/** Disconnects every socket; part of graceful shutdown. */
export function closeRealtime() {
  return new Promise((resolve) => (io ? io.close(() => resolve()) : resolve()))
}

/**
 * An order changed: staff screens get the global signal, and only the pages
 * tracking this order get the room signal (CLAUDE.md §10b).
 */
export function notifyOrderChanged(order) {
  io?.emit(SOCKET_EVENTS.orderUpdated)
  io?.to(roomFor(order.orderNumber)).emit(SOCKET_EVENTS.orderTracked)
}

export function emit(event, payload) {
  io?.emit(event, payload)
}
