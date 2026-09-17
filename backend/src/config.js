import 'dotenv/config'

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

  /** Proxy hops in front of the app (Render/Railway = 1), so rate limits see real IPs. */
  trustProxy: intFromEnv('TRUST_PROXY', isProd ? 1 : 0),

  rateLimits: {
    loginPerAccount: intFromEnv('RATE_LIMIT_LOGIN_PER_ACCOUNT', 5),
    loginPerIp: intFromEnv('RATE_LIMIT_LOGIN_PER_IP', 30),
    trackPerMinute: intFromEnv('RATE_LIMIT_TRACK_PER_MINUTE', 120),
    ordersPer10Min: intFromEnv('RATE_LIMIT_ORDERS', 20),
  },

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
