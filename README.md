# Healthy Eats

Ordering and delivery platform for a fitness-focused kitchen, built as a working prototype.
Brand details (address, phone, FSSAI number) shipped in this repo are placeholders — see
the `BRAND` constant in `frontend/src/shared/index.js` (and its copy in `backend/`).

Every dish is tagged by **fitness goal** (fat loss · muscle gain · basic fitness) and by
**timing** (pre-workout · post-workout · meal), with calories and macros on every plate.

Payment is **cash on delivery only**. Customers order as guests — no account needed.

---

## Quick start

```bash
npm run install:all   # installs root, frontend and backend
npm run dev           # API on :4000, frontend on :5173
```

Open **http://localhost:5173**.

No database setup is needed: with `MONGODB_URI` unset, an in-memory MongoDB starts
automatically and seeds itself. Point `MONGODB_URI` at Atlas when you want persistence —
nothing else changes.

### Staff sign-in — each role has its own page

| Role   | Sign in at                          | Account                                                      |
| ------ | ----------------------------------- | ------------------------------------------------------------ |
| Admin  | http://localhost:5173/admin/login   | `ADMIN_EMAIL` + password whose hash is `ADMIN_PASSWORD_HASH` |
| Chef   | http://localhost:5173/kitchen/login | `CHEF_EMAIL` + password whose hash is `CHEF_PASSWORD_HASH`   |
| Driver | http://localhost:5173/driver/login  | created by admin under Admin → Drivers                       |

There is exactly one admin and one chef, and their passwords exist **only as bcrypt hashes** in
`backend/.env` (or the host's environment settings). The server refuses to start without
`JWT_SECRET`, `ADMIN_PASSWORD_HASH` and `CHEF_PASSWORD_HASH`. To set or rotate a password:

```bash
cd backend
npm run hash-password      # type the new password; it prints a hash
# paste the hash into backend/.env in single quotes, then restart — old sessions end
```

Each sign-in page calls its own endpoint (`/api/auth/<role>/login`), which only accepts that role.
Customers never sign in — checkout is guest-only.

---

## The three screens

| Screen                               | Route                                            | Who            |
| ------------------------------------ | ------------------------------------------------ | -------------- |
| Storefront, menu, checkout, tracking | `/`, `/menu`, `/checkout`, `/track/:orderNumber` | anyone         |
| Kitchen display                      | `/kitchen`                                       | chef, admin    |
| Monitoring dashboard                 | `/admin`                                         | **admin only** |

**Try the whole loop:** open `/menu`, `/kitchen` and `/admin` in three windows. Place an
order → it appears in admin → Accept → it lands on the kitchen screen → Ready to Go →
admin marks delivered. Everything updates live over Socket.IO; nothing needs refreshing.

### Order lifecycle

```
PLACED ──admin Accept──▶ PREPARING ──chef Ready──▶ READY ──admin──▶ DELIVERED
   │                          │
   └────── admin Cancel ◀─────┘   → admin picks which dish(es) sold out
                                  → those go "Unavailable today", reset next day
```

Cancelling is blocked once an order is `ready` — it has already been cooked.

---

## Stack

React + Vite · JavaScript · Tailwind · shadcn/ui · TanStack Query · Zustand · Leaflet
Node + Express · Mongoose · Zod · Socket.IO · JWT in httpOnly cookies

Frontend and backend are hosted as separate services, so each carries its own identical copy of
the Zod contract: `frontend/src/shared/index.js` and `backend/src/shared/index.js`. There is no
root `shared/` folder. Edit one, copy it over the other, and commit both together —
`tests/unit/shared-sync.test.js` fails loudly if they ever differ.

```
frontend/   React app, fully self-contained
backend/    Express API, fully self-contained
design/     design handoff
```

---

## Scripts

| Command            | Does                        |
| ------------------ | --------------------------- |
| `npm run dev`      | frontend + backend together |
| `npm run build`    | production build of both    |
| `npm test`         | Vitest unit tests           |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:all` | both                        |
| `npm run format`   | Prettier across the repo    |

## Tests

**70 tests.** `npm run test:all`.

**Unit (52)** — the shared contract, since frontend and backend both depend on it:
the order state machine, the Zod schemas, and the cart arithmetic.

**End-to-end (18)** — Playwright, against the running app:

- _Guest checkout_ — ordering without an account, validation, cart persistence, unknown order numbers.
- _The three-screen loop_ — an order travelling customer → admin → chef → admin, asserting the
  chef's button appears live over Socket.IO with no reload, and that the allergy note reaches
  the kitchen.
- _Cancel → sold out_ — admin picks a dish, the customer is told which one ran out, and the
  public menu refuses it.
- _Access control_ — tested at the API, not the UI, because hiding a screen is not access control.
  Anonymous gets 401, chef gets 403 on admin routes, registering with `role: "admin"` still
  produces a customer, and a tampered price in the payload is ignored.

---

## Before this goes live

Two items need a decision:

1. **Content Security Policy** — `frontend/vercel.json` sets the basic security headers, but no
   CSP yet; add one once the production API, map-tile and geocoder URLs are fixed (§18).
2. **Real menu** — 119 dishes are seeded from the kitchen's printed menu, but it carries no
   calorie or macro figures; `nutrition` is optional and the UI shows "Macros on request"
   rather than inventing numbers (§8b).

Also: set `JWT_SECRET` and both staff password hashes in the host's environment settings — the
server refuses to boot without them. Security details and scaling notes: CLAUDE.md §18. If the frontend and backend end up on separate domains
(e.g. Vercel + Render), set `VITE_API_URL` and `VITE_SOCKET_URL` — see `frontend/.env.example`.
