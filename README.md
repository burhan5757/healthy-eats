# Healthy Eats

Ordering and delivery platform for a fitness-focused kitchen, built as a working prototype.
Brand details (address, phone, FSSAI number) shipped in this repo are placeholders — see
`shared/index.js`'s `BRAND` constant.

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

### Staff sign-in — http://localhost:5173/login

| Role  | Email                  | Password   |
| ----- | ---------------------- | ---------- |
| Admin | `admin@healthyeats.in` | `admin123` |
| Chef  | `chef@healthyeats.in`  | `chef123`  |

Both are seeded server-side and **cannot be registered**. Change them via `backend/.env`
before this goes anywhere real.

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

`shared/index.js` is the canonical Zod-schema source. Frontend and backend host on separate
services, so each keeps its own committed copy (`frontend/src/shared/`, `backend/src/shared/`)
rather than importing the sibling folder — run `npm run sync-shared` after editing the
canonical file (also runs automatically on `dev`/`build`), then commit all three together.
`tests/unit/shared-sync.test.js` fails loudly if a copy ever drifts.

```
frontend/   React app (with its own committed copy of shared/)
backend/    Express API (with its own committed copy of shared/)
shared/     Zod schemas — canonical source, hand-edited here only
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

1. **Order-number privacy** — tracking is public by 4-digit order number, per the design.
   Enumerable. Lengthen the number or add a phone check first (§10b).
2. **Real menu** — 119 dishes are seeded from the kitchen's printed menu, but it carries no
   calorie or macro figures; `nutrition` is optional and the UI shows "Macros on request"
   rather than inventing numbers (§8b).

Also: set `JWT_SECRET` and change both staff passwords. The server refuses to boot in
production with the dev defaults. If the frontend and backend end up on separate domains
(e.g. Vercel + Render), set `VITE_API_URL` and `VITE_SOCKET_URL` — see `frontend/.env.example`.
