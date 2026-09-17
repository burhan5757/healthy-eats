import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { config } from '../config.js'

/**
 * In-memory counters — correct for a single backend instance. Running more than
 * one instance behind a load balancer needs a shared store (Redis), see
 * CLAUDE.md §18.
 */

const tooMany = (message) => (_req, res) => res.status(429).json({ error: message })

const ip = (req) => ipKeyGenerator(req.ip)
const LOGIN_WINDOW = 15 * 60 * 1000
const loginMessage = 'Too many sign-in attempts. Try again in a few minutes.'

/** Failed sign-ins per email from one IP: stops password guessing on one account. */
const loginPerAccount = rateLimit({
  windowMs: LOGIN_WINDOW,
  limit: config.rateLimits.loginPerAccount,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ip(req)}|${String(req.body?.email ?? '').toLowerCase()}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany(loginMessage),
})

/** Failed sign-ins from one IP across all emails: stops credential stuffing. */
const loginPerIp = rateLimit({
  windowMs: LOGIN_WINDOW,
  limit: config.rateLimits.loginPerIp,
  skipSuccessfulRequests: true,
  keyGenerator: ip,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany(loginMessage),
})

export const loginLimiter = [loginPerIp, loginPerAccount]

export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimits.trackPerMinute,
  keyGenerator: ip,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany('Too many lookups. Wait a minute and try again.'),
})

export const placeOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.rateLimits.ordersPer10Min,
  keyGenerator: ip,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany('Too many orders from this connection. Try again shortly.'),
})
