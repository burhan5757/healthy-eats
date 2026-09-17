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
- [ ] **2. Cross-site cookies will be blocked.** An `*.onrender.com` cookie on a `*.vercel.app`
      page is third-party; Safari (all iPhones) and Chrome incognito block it, so staff logins
      fail there. Fix: same-site API — a custom domain with `api.` subdomain
      (`COOKIE_SAME_SITE=lax`), or a Vercel rewrite proxying `/api` to the backend.
- [ ] **3. Placeholder brand data.** `BRAND` in `shared/index.js` has phone `+91 90000 00000`,
      address "Shop 0, Example Complex", FSSAI `00000000000000`, and placeholder `geo` —
      **delivery is priced from `geo`**, so every fee would be wrong. FSSAI display is a legal
      requirement for Indian food businesses.
- [ ] **4. "Macros on every plate" hero pill is false.** No dish has nutrition data (§8b).
- [ ] **5. COD orders need no verification.** Any phone number, no OTP; the only guard is
      20 orders per IP, which also blocks real customers behind Indian mobile CGNAT.
      Add OTP or a confirm-call step before the kitchen cooks.
- [ ] **6. Unit suite is red** — `geocode.test.js` distance assertion vs placeholder `geo`.
- [x] **7. Most recent work was uncommitted.** Committed as `2394a04` (2026-09-17).

## 🟠 Fix before real traffic

- [ ] **8. Timezone.** `todayKey()` (`backend/src/models/Dish.js`) and `/orders/stats` use the
      server's local zone; Render runs UTC, so sold-out resets at 05:30 IST and "today's
      revenue" is the wrong window. Pin to `Asia/Kolkata`.
- [ ] **9. Every order's pincode is hardcoded to `411038`** (`frontend/src/pages/Checkout.jsx`).
- [ ] **10. Unbounded input.** `placeOrderSchema` has no max qty / item count; `reason`,
      `name`, `line1`, `landmark` have no max length.
- [ ] **11. Malformed ids → 500.** Bad `dishId` on `POST /orders`, bad `:id` on
      `PATCH /menu/:id/availability` hit a Mongoose CastError (from code reading).
- [ ] **12. Transition races.** Transitions do read → modify → `save()`; concurrent
      admin-cancel and chef-ready can leave a cancelled order that was ready. Use a conditional
      `findOneAndUpdate({ _id, status: from })`.
- [ ] **13. Opening hours and delivery radius not enforced** — orders at 3 am, a 400 km pin
      is charged ₹4,000.
- [ ] **14. No privacy policy / terms / refund page**, while names, phones and addresses are
      stored indefinitely (India DPDP Act).
- [x] **15. Silent in-memory DB in production.** _Fixed 2026-09-17: `MONGODB_URI` is required when `NODE_ENV=production`._ If `MONGODB_URI` is unset and dev deps are
      installed, prod runs on `mongodb-memory-server` and loses every order on restart.
- [ ] **16. Operability.** No graceful `SIGTERM` shutdown, no React error boundary, no error
      monitoring, `/api/health` ignores DB state.
- [ ] **17. Stock dish photos** not captioned as illustrative (§16).
- [ ] **18. Public Nominatim** is not for production traffic (§15).
- [ ] **19. No CI** running tests on push.
- [ ] **20. `qs` moderate advisory** in the backend (`npm audit fix`).

## 🟡 Later

- [ ] **21.** `/orders/stats` loads every order into memory on each call.
- [ ] **22.** Every open tracking page refetches on any order change anywhere.
- [ ] **23.** No Content-Security-Policy (§18).
- [ ] **24.** Mongoose `new:` option deprecation warnings (use `returnDocument: 'after'`).
- [ ] **25.** Login timing difference reveals whether an email exists.
- [ ] **26.** Duplicate `dishId` lines in an order return "dish no longer exists".
