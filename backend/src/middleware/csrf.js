import { config } from '../config.js'

export const CSRF_HEADER = 'x-healthy-eats'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF guard for cookie-authenticated writes. In production the auth cookie is
 * SameSite=None (frontend and API on different sites), so another site could
 * otherwise make a signed-in browser POST here. Two checks:
 *  - a custom header, which a cross-site page cannot send without a CORS
 *    preflight — and CORS only allows CLIENT_ORIGIN;
 *  - when the browser reports an Origin, it must be CLIENT_ORIGIN.
 */
export function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const origin = req.get('origin')
  if (req.get(CSRF_HEADER) !== '1' || (origin && origin !== config.clientOrigin)) {
    res.status(403).json({ error: 'Request blocked: cross-site request.' })
    return
  }
  next()
}
