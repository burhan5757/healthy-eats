/**
 * Test-only staff credentials for the Playwright backend (in-memory database).
 * playwright.config.js hands the hashes to the server as env; specs sign in
 * with the plain values. Never used against Atlas or in production.
 */
export const ADMIN = {
  role: 'admin',
  email: 'admin@healthyeats.in',
  password: 'e2e-admin-password-only',
  loginPath: '/admin/login',
}
export const CHEF = {
  role: 'chef',
  email: 'chef@healthyeats.in',
  password: 'e2e-chef-password-only',
  loginPath: '/kitchen/login',
}

export const TEST_SERVER_ENV = {
  JWT_SECRET: 'e2e-only-jwt-secret-that-is-at-least-32-chars',
  ADMIN_PASSWORD_HASH:
    '$2b$12$P6aHTbywbFMT.vK1WMfYnetRNPyGAlBMG5htwy1eDotjn/V366JkC',
  CHEF_PASSWORD_HASH:
    '$2b$12$N4IBWjm4A8yxB0nkUcrotOHOSlpDga/SScFlM8miSvqKJXPXin6nm',
  // Specs place dozens of orders from one IP; login limits stay at defaults
  // so the brute-force limiter is exercised for real.
  RATE_LIMIT_ORDERS: '1000',
  // Tests run at any hour; the hours check is covered by isOpenAt unit tests.
  ENFORCE_ORDERING_HOURS: 'false',
  // Phone verification stays on, via the no-send test provider (code 123456).
  SMS_PROVIDER: 'test',
  OTP_REQUIRED: 'true',
  RATE_LIMIT_OTP_PER_IP: '1000',
  RATE_LIMIT_OTP_VERIFY_PER_IP: '1000',
}

/** What the test SMS provider always "sends". */
export const TEST_OTP_CODE = '123456'

/** Sent on every request, like the real frontend — the API's CSRF guard. */
export const CSRF_HEADERS = { 'X-Healthy-Eats': '1' }
