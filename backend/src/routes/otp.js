import { randomInt } from 'node:crypto'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { OTP_LENGTH, otpSendSchema, otpVerifySchema } from '../shared/index.js'
import { config } from '../config.js'
import { Otp, codeMatches, hashCode } from '../models/Otp.js'
import { smsProvider } from '../sms/index.js'
import { asyncRoute, validate } from '../middleware/validate.js'
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit.js'

/**
 * Phone verification for guest checkout (CLAUDE.md §23). The customer asks for
 * a code, types it back, and gets a short-lived phoneToken that POST /orders
 * requires. No account is created.
 */
export const otpRouter = Router()

const TOKEN_PURPOSE = 'order-phone'

otpRouter.post(
  '/send',
  otpSendLimiter,
  validate(otpSendSchema),
  asyncRoute(async (req, res) => {
    if (!config.sms.provider) {
      res.status(503).json({ error: 'Phone verification is not available.' })
      return
    }
    const { phone } = req.body
    const now = Date.now()

    const existing = await Otp.findOne({ phone })
    const waitMs = existing
      ? existing.sentAt.getTime() + config.otp.resendSeconds * 1000 - now
      : 0
    if (waitMs > 0) {
      res.status(429).json({
        error: `Wait ${Math.ceil(waitMs / 1000)} seconds before asking for another code.`,
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      })
      return
    }

    const provider = smsProvider()
    const code =
      provider.fixedCode ??
      String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')

    await Otp.findOneAndUpdate(
      { phone },
      {
        $set: {
          codeHash: hashCode(phone, code),
          attempts: 0,
          sentAt: new Date(now),
          expiresAt: new Date(now + config.otp.ttlMinutes * 60 * 1000),
        },
      },
      { upsert: true },
    )

    try {
      await provider.sendOtp(phone, code)
    } catch (err) {
      console.error('[otp] SMS send failed', err)
      await Otp.deleteOne({ phone })
      res.status(502).json({
        error: 'We could not send the code. Check the number and try again.',
      })
      return
    }

    res.json({
      ok: true,
      expiresInSeconds: config.otp.ttlMinutes * 60,
      resendInSeconds: config.otp.resendSeconds,
    })
  }),
)

otpRouter.post(
  '/verify',
  otpVerifyLimiter,
  validate(otpVerifySchema),
  asyncRoute(async (req, res) => {
    const { phone, code } = req.body
    const otp = await Otp.findOne({ phone })

    if (!otp || otp.expiresAt <= new Date()) {
      res
        .status(400)
        .json({ error: 'That code has expired. Ask for a new one.' })
      return
    }
    if (otp.attempts >= config.otp.maxAttempts) {
      await Otp.deleteOne({ phone })
      res
        .status(429)
        .json({ error: 'Too many wrong codes. Ask for a new one.' })
      return
    }
    if (!codeMatches(otp, code)) {
      await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } })
      res.status(400).json({ error: 'That code is not right. Check the SMS.' })
      return
    }

    await Otp.deleteOne({ _id: otp._id })
    const phoneToken = jwt.sign(
      { phone, purpose: TOKEN_PURPOSE },
      config.jwtSecret,
      { expiresIn: `${config.otp.tokenMinutes}m` },
    )
    res.json({ phoneToken })
  }),
)

/** The verified phone in a phoneToken, or null if it is missing or invalid. */
export function verifiedPhone(phoneToken) {
  if (!phoneToken) return null
  try {
    const payload = jwt.verify(phoneToken, config.jwtSecret)
    return payload.purpose === TOKEN_PURPOSE &&
      typeof payload.phone === 'string'
      ? payload.phone
      : null
  } catch {
    return null
  }
}
