import { randomBytes } from 'node:crypto'
import mongoose, { Schema } from 'mongoose'

/**
 * One row per signed-in browser. The JWT only carries this id (`sid`); a token
 * whose session row is gone is treated as signed out. That is what makes
 * logout, driver deactivation and password rotation take effect immediately
 * instead of when the JWT expires (CLAUDE.md §18). Mongo's TTL index removes
 * expired rows on its own.
 */
const sessionSchema = new Schema({
  _id: { type: String, default: () => randomBytes(32).toString('base64url') },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export const Session = mongoose.model('Session', sessionSchema)

/**
 * Every signed-in request looks its session up, which is an Atlas round trip.
 * Lookups are remembered briefly. Revocation in this process clears the entry
 * at once; another backend instance could keep serving a revoked session for
 * up to CACHE_MS (CLAUDE.md §18).
 */
const CACHE_MS = 30_000
const MAX_ENTRIES = 5_000
const recent = new Map() // sid -> { session, until }

export async function findSession(sid) {
  const hit = recent.get(sid)
  if (hit && hit.until > Date.now()) return hit.session
  const session = await Session.findById(sid).lean()
  if (session) {
    if (recent.size >= MAX_ENTRIES) recent.clear()
    recent.set(sid, { session, until: Date.now() + CACHE_MS })
  } else {
    recent.delete(sid)
  }
  return session
}

export async function endSession(sid) {
  recent.delete(sid)
  await Session.deleteOne({ _id: sid })
}

export async function endSessionsFor(userId) {
  const id = String(userId)
  for (const [sid, { session }] of recent) {
    if (String(session.user) === id) recent.delete(sid)
  }
  await Session.deleteMany({ user: userId })
}
