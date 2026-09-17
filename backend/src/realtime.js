import { Server } from 'socket.io'
import { config } from './config.js'

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
    socket.on('disconnect', () => {})
  })

  console.log('[realtime] socket.io ready')
}

export function emit(event, payload) {
  io?.emit(event, payload)
}
