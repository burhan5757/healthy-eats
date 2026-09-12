import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { config } from './config.js'

let io: Server | null = null

/**
 * Socket.IO keeps the chef and admin screens live without polling.
 *
 * Broadcasts carry no private data beyond the order itself, and every screen
 * still fetches through the role-guarded REST API — sockets are an invalidation
 * signal, not an authorization bypass.
 */
export function initRealtime(server: HttpServer): void {
  io = new Server(server, {
    cors: { origin: config.clientOrigin, credentials: true },
  })

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {})
  })

  console.log('[realtime] socket.io ready')
}

export function emit(event: string, payload: unknown): void {
  io?.emit(event, payload)
}
