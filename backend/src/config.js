import 'dotenv/config'

/**
 * Server configuration.
 *
 * The single admin account is seeded from these values and is NOT registerable.
 * See CLAUDE.md §10 — this is a hard access-control rule, not a preference.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production',

  /** Unset in dev → an in-memory MongoDB is started automatically. */
  mongoUri: process.env.MONGODB_URI ?? '',

  jwtSecret: process.env.JWT_SECRET ?? 'healthy-eats-dev-secret-change-me',
  jwtExpiresIn: '7d',

  admin: {
    name: process.env.ADMIN_NAME ?? 'Healthy Eats Admin',
    email: process.env.ADMIN_EMAIL ?? 'admin@healthyeats.in',
    password: process.env.ADMIN_PASSWORD ?? 'admin123',
  },
  chef: {
    name: process.env.CHEF_NAME ?? 'Kitchen',
    email: process.env.CHEF_EMAIL ?? 'chef@healthyeats.in',
    password: process.env.CHEF_PASSWORD ?? 'chef123',
  },
};        

if (config.isProd && config.jwtSecret === 'healthy-eats-dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production')
}

if (config.isProd && config.admin.password === 'admin123') {
  throw new Error('ADMIN_PASSWORD must be changed in production')
}
