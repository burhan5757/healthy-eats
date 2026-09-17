# Production readiness — audit and fix list

Audit date: 2026-09-17. Audited commit: `2394a04` (branch `drivers-security-payments`).

**Verdict: not production-ready yet.** The core is solid — server-side role enforcement,
revocable sessions, CSRF guard, rate limits, unguessable order numbers, server-computed
totals, and a good e2e suite. What blocks launch is mostly deployment configuration,
placeholder business data, and a handful of real bugs.

Tick items off here as they are fixed, with the date and the commit.

## Checks at audit time

| Check                         | Result                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| Unit tests (Vitest)           | 74 / 75 pass — `geocode.test.js:23` fails (known)             |
| E2E tests (Playwright)        | 46 / 46 pass                                                  |
| Lint (oxlint)                 | Clean, 2 fast-refresh warnings in `store/auth.jsx`            |
| Frontend build                | Passes; main chunk 434 KB (135 KB gzip)                       |
| `npm audit --omit=dev`        | Frontend 0; backend 1 moderate (`qs`, fixable)                |
| Secrets in git history        | None found; `.env` and `private/` ignored                     |

## 🔴 Launch blockers

- [x] **1. `NODE_ENV=production` is never set or documented.** _Fixed 2026-09-17: server refuses to start on Render/Railway without it; documented in `backend/.env.example`._ Render/Railway don't set it.
      Without it `backend/src/config.js` issues a non-`Secure`, `SameSite=Lax` cookie (staff
      can't stay signed in cross-site) and `trust proxy` is 0, so every visitor shares the
      proxy's IP and therefore **one global rate-limit bucket** (20 orders / 10 min site-wide).
- [x] **2. Cross-site cookies will be blocked.** _Fixed 2026-09-17 (config + docs): API on `api.` subdomain with `COOKIE_SAME_SITE=lax`, Cloudflare `_headers`, README "Deploying". Takes effect when deployed that way._ An `*.onrender.com` cookie on a `*.vercel.app`
      page is third-party; Safari (all iPhones) and Chrome incognito block it, so staff logins
      fail there. Fix: same-site API — a custom domain with `api.` subdomain
      (`COOKIE_SAME_SITE=lax`), or a Vercel rewrite proxying `/api` to the backend.
- [ ] **3. Placeholder brand data.** _Guard added 2026-09-17: production won't start while `BRAND.placeholder` is true. Still open: the real details._ `BRAND` in `shared/index.js` has phone `+91 90000 00000`,
      address "Shop 0, Example Complex", FSSAI `00000000000000`, and placeholder `geo` —
      **delivery is priced from `geo`**, so every fee would be wrong. FSSAI display is a legal
      requirement for Indian food businesses.
- [ ] **4. Macro figures are unverified estimates.** _Corrected 2026-09-17: the audit said no dish had nutrition data — wrong, every dish has figures, but all except seven are estimates not checked by a dietitian, shown as plain facts. Copy that promised reviewed macros is fixed. Still open: label as estimates, hide, or get the kitchen to confirm._
- [ ] **5. COD orders need no verification.** _Code done 2026-09-17 (SMS OTP, 3 open orders per phone, see CLAUDE.md §23). Still open: choose an SMS provider, add its adapter, register DLT._ Any phone number, no OTP; the only guard is
      20 orders per IP, which also blocks real customers behind Indian mobile CGNAT.
      Add OTP or a confirm-call step before the kitchen cooks.
- [x] **6. Unit suite is red** _Fixed 2026-09-17: test measures between fixed points, not the placeholder kitchen._ — `geocode.test.js` distance assertion vs placeholder `geo`.
- [x] **7. Most recent work was uncommitted.** Committed as `2394a04` (2026-09-17).

## 🟠 Fix before real traffic

- [x] **8. Timezone.** _Fixed 2026-09-17: `dayKey()` / `BUSINESS_TIME_ZONE` in shared; sold-out reset and stats use IST._ `todayKey()` (`backend/src/models/Dish.js`) and `/orders/stats` use the
      server's local zone; Render runs UTC, so sold-out resets at 05:30 IST and "today's
      revenue" is the wrong window. Pin to `Asia/Kolkata`.
- [x] **9. Every order's pincode is hardcoded to `411038`** (`frontend/src/pages/Checkout.jsx`). _Fixed 2026-09-17: pincode field, pre-filled from the pin's reverse lookup._
- [x] **10. Unbounded input.** _Fixed 2026-09-17: max 20 per dish, 30 lines, length caps on text fields; steppers stop at 20._ `placeOrderSchema` has no max qty / item count; `reason`,
      `name`, `line1`, `landmark` have no max length.
- [x] **11. Malformed ids → 500.** _Fixed 2026-09-17: ids validated in schemas and by `router.param` (404); e2e-covered._ Bad `dishId` on `POST /orders`, bad `:id` on
      `PATCH /menu/:id/availability` hit a Mongoose CastError (from code reading).
- [x] **12. Transition races.** _Fixed 2026-09-17: `optimisticConcurrency` on orders; a stale save returns 409._ Transitions do read → modify → `save()`; concurrent
      admin-cancel and chef-ready can leave a cancelled order that was ready. Use a conditional
      `findOneAndUpdate({ _id, status: from })`.
- [x] **13. Opening hours and delivery radius not enforced** _Fixed 2026-09-17: orders 11:00–22:00 IST (server-enforced in prod); pins over 25 km refused._ — orders at 3 am, a 400 km pin
      is charged ₹4,000.
- [x] **14. No privacy policy / terms / refund page**, while names, phones and addresses are
      stored indefinitely (India DPDP Act). _Fixed 2026-09-17: draft `/privacy` and `/terms`, pending legal review._
- [x] **15. Silent in-memory DB in production.** _Fixed 2026-09-17: `MONGODB_URI` is required when `NODE_ENV=production`._ If `MONGODB_URI` is unset and dev deps are
      installed, prod runs on `mongodb-memory-server` and loses every order on restart.
- [ ] **16. Operability.** _Mostly fixed 2026-09-17: graceful SIGTERM/SIGINT shutdown, `/api/health` returns 503 without a DB connection, React error boundary. Still open: error monitoring (e.g. Sentry) needs an account._ No graceful `SIGTERM` shutdown, no React error boundary, no error
      monitoring, `/api/health` ignores DB state.
- [x] **17. Stock dish photos** not captioned as illustrative (§16). _Fixed 2026-09-17: "Illustrative photo" tag._
- [ ] **18. Public Nominatim** is not for production traffic (§15). _Partly fixed 2026-09-17: `VITE_GEOCODER_URL` makes the switch an env change. Still open: pick a geocoder._
- [x] **19. No CI** running tests on push. _Added 2026-09-17: `.github/workflows/ci.yml` (lint, unit, build, e2e). Not yet run on GitHub — check the first run after pushing._
- [x] **20. `qs` moderate advisory** _Fixed 2026-09-17: `npm audit fix`, 0 vulnerabilities._ in the backend (`npm audit fix`).

## 🟡 Later

- [x] **21.** _Fixed 2026-09-17: MongoDB aggregation in `backend/src/stats.js`, checked against the old version._ `/orders/stats` loads every order into memory on each call.
- [x] **22.** _Fixed 2026-09-17: per-order socket rooms; e2e-covered._ Every open tracking page refetches on any order change anywhere.
- [x] **23.** _Fixed 2026-09-17: CSP in `_headers` and `vercel.json`, checked on the production build._ No Content-Security-Policy (§18).
- [x] **24.** _Fixed 2026-09-17._ Mongoose `new:` option deprecation warnings (use `returnDocument: 'after'`).
- [x] **25.** _Fixed 2026-09-17: a dummy bcrypt compare runs when the account doesn't match._ Login timing difference reveals whether an email exists.
- [x] **26.** _Fixed 2026-09-17: rejected by the schema with a clear message._ Duplicate `dishId` lines in an order return "dish no longer exists".

## Found while fixing

- [x] **27.** Footer "Track an order" linked to a non-existent `/account` page, and no page let a
      customer type an order number. _Fixed 2026-09-17: `/track` lookup page._
- [x] **28.** Header wordmark and Order Now button wrapped onto two lines on phones. _Fixed 2026-09-17._
- [x] **29.** Contact page said orders after 22:00 are cooked next day; About said nothing is
      stored online. _Fixed 2026-09-17._
- [ ] **30.** `private/brand-real-details.md` exists (gitignored). The real details belong in
      `BRAND`, which is committed — decide whether the repo is private enough for them.

