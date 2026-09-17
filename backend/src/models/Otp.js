import { createHmac, timingSafeEqual } from 'node:crypto'
import mongoose, { Schema } from 'mongoose'
import { config } from '../config.js'

/**
 * One pending phone-verification code per phone number. The code itself is
 * never stored, only an HMAC of it; Mongo's TTL index removes expired rows.
 * The attempt counter, not the hash, is what stops guessing (CLAUDE.md §23).
 */
const otpSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export const Otp = mongoose.model('Otp', otpSchema)

export function hashCode(phone, code) {
  return createHmac('sha256', config.jwtSecret)
    .update(`otp:${phone}:${code}`)
    .digest('hex')
}

export function codeMatches(otp, code) {
  const expected = Buffer.from(otp.codeHash, 'hex')
  const actual = Buffer.from(hashCode(otp.phone, code), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
