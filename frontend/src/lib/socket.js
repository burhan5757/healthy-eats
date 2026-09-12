import { io } from 'socket.io-client'

let socket = null

/**
 * Lazily-created shared Socket.IO connection.
 *
 * Sockets are an invalidation signal only — every screen still reads through the
 * role-guarded REST API, so a broadcast can never widen what someone may see
 * (CLAUDE.md §10).
 *
 * VITE_SOCKET_URL is empty by default, which keeps today's same-origin
 * connection (the Vite dev proxy forwards it). Set it when the frontend and
 * backend are hosted on separate domains.
 */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}
