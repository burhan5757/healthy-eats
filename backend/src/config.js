import 'dotenv/config'
import { BRAND } from './shared/index.js'

/**
 * Server configuration.
 *
 * Staff passwords live ONLY here, as bcrypt hashes in env — never plain text,
 * never a default. There is exactly one admin and one chef, seeded (and kept in
 * sync) from these values; neither is registerable (CLAUDE.md §10, §18).
 * Generate a hash with `npm run hash-password`.
 */

const isProd = process.env.NODE_ENV === 'production'
const problems = []

// Render sets RENDER, Railway sets RAILWAY_ENVIRONMENT. Neither sets NODE_ENV,
// and without it the cookie is not Secure/cross-site and rate limits see the
// proxy's IP instead of the visitor's — so refuse to run half-configured.
const onHost = Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
if (onHost && !isProd) {
  problems.push('NODE_ENV must be set to "production" on the hosting service')
}
// Demo brand details (phone, address, FSSAI number, kitchen coordinates) must
// never reach customers — delivery fees are priced from BRAND.geo.
if (isProd && BRAND.placeholder) {
  problems.push(
    'BRAND in src/shared/index.js still holds placeholder business details — fill in the real ones (both copies) and set placeholder: false',
  )
}
// Without a URI the server falls back to an in-memory database, which loses
// every order on restart — fine for development, never for production.
if (isProd && !process.env.MONGODB_URI) {
  problems.push('MONGODB_URI must be set in production')
}

// $2a/$2b/$2y, two-digit cost, 53 chars of salt+digest.
const BCRYPT_HASH = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/
const MIN_BCRYPT_COST = 12

function requiredHash(name) {
  const value = process.env[name] ?? ''
  const match = BCRYPT_HASH.exec(value)
  if (!match) {
    problems.push(
      `${name} must be a bcrypt hash (run \`npm run hash-password\` in backend/ and paste the result, in single quotes)`,
    )
  } else if (Number(match[1]) < MIN_BCRYPT_COST) {
    problems.push(`${name} must use bcrypt cost ${MIN_BCRYPT_COST} or higher`)
  }
  return value
}

function requiredSecret(name, minLength) {
  const value = process.env[name] ?? ''
  if (value.length < minLength) {
    problems.push(`${name} must be set to at least ${minLength} random characters`)
  }
  return value
}

function intFromEnv(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    problems.push(`${name} must be a non-negative integer`)
    return fallback
  }
  return n
}

/**
 * SMS providers with an adapter in src/sms/. 'test' sends nothing and uses a
 * fixed code, so it is never allowed in production.
 */
const SMS_PROVIDERS = ['test']
const smsProviderName = process.env.SMS_PROVIDER ?? (isProd ? '' : 'test')
const otpRequired = process.env.OTP_REQUIRED
  ? process.env.OTP_REQUIRED === 'true'
  : true
if (smsProviderName && !SMS_PROVIDERS.includes(smsProviderName)) {
  problems.push(
    `SMS_PROVIDER must be one of: ${SMS_PROVIDERS.join(', ')} (got "${smsProviderName}")`,
  )
}
if (isProd && smsProviderName === 'test') {
  problems.push('SMS_PROVIDER=test sends no SMS and cannot be used in production')
}
if (otpRequired && !smsProviderName) {
  problems.push(
    'OTP_REQUIRED is on but no SMS_PROVIDER is set — configure a provider, or set OTP_REQUIRED=false to take unverified orders',
  )
}

const sameSite = process.env.COOKIE_SAME_SITE ?? (isProd ? 'none' : 'lax')
if (!['lax', 'strict', 'none'].includes(sameSite)) {
  problems.push('COOKIE_SAME_SITE must be lax, strict or none')
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProd,

  /** Unset in dev → an in-memory MongoDB is started automatically. */
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDb: process.env.MONGODB_DB ?? 'healthy-eats',

  jwtSecret: requiredSecret('JWT_SECRET', 32),
  sessionTtlHours: intFromEnv('SESSION_TTL_HOURS', 12),
  cookieSameSite: sameSite,

  /** Refuse orders outside BRAND.orderingHours. On in production, off in dev. */
  enforceOrderingHours: process.env.ENFORCE_ORDERING_HOURS
    ? process.env.ENFORCE_ORDERING_HOURS === 'true'
    : isProd,

  /** Proxy hops in front of the app (Render/Railway = 1), so rate limits see real IPs. */
  trustProxy: intFromEnv('TRUST_PROXY', isProd ? 1 : 0),

  rateLimits: {
    loginPerAccount: intFromEnv('RATE_LIMIT_LOGIN_PER_ACCOUNT', 5),
    loginPerIp: intFromEnv('RATE_LIMIT_LOGIN_PER_IP', 30),
    trackPerMinute: intFromEnv('RATE_LIMIT_TRACK_PER_MINUTE', 120),
    // Customers on one mobile network often share an IP, so this is generous;
    // the per-phone open-order cap below is the real abuse limit.
    ordersPer10Min: intFromEnv('RATE_LIMIT_ORDERS', 60),
    otpSendsPerIp: intFromEnv('RATE_LIMIT_OTP_PER_IP', 20),
    otpSendsPerPhone: intFromEnv('RATE_LIMIT_OTP_PER_PHONE', 5),
    otpVerifiesPerIp: intFromEnv('RATE_LIMIT_OTP_VERIFY_PER_IP', 60),
  },

  sms: { provider: smsProviderName },

  /** Orders need a phone verified by SMS code (CLAUDE.md §23). */
  otp: {
    required: otpRequired,
    ttlMinutes: 5,
    resendSeconds: 30,
    maxAttempts: 5,
    tokenMinutes: 30,
  },

  /** Unfinished orders one phone number may have at once. */
  openOrdersPerPhone: intFromEnv('OPEN_ORDERS_PER_PHONE', 3),

  admin: {
    name: process.env.ADMIN_NAME ?? 'Healthy Eats Admin',
    email: process.env.ADMIN_EMAIL ?? 'admin@healthyeats.in',
    passwordHash: requiredHash('ADMIN_PASSWORD_HASH'),
  },
  chef: {
    name: process.env.CHEF_NAME ?? 'Kitchen',
    email: process.env.CHEF_EMAIL ?? 'chef@healthyeats.in',
    passwordHash: requiredHash('CHEF_PASSWORD_HASH'),
  },
}

if (problems.length > 0) {
  throw new Error(
    'Server configuration is incomplete — fix backend/.env (see .env.example):\n  - ' +
      problems.join('\n  - '),
  )
}
