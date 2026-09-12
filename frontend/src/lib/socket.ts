import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Lazily-created shared Socket.IO connection.
 *
 * Sockets are an invalidation signal only — every screen still reads through the
 * role-guarded REST API, so a broadcast can never widen what someone may see
 * (CLAUDE.md §10).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] })
  }
  return socket
}
