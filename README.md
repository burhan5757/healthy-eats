# Healthy Eats

Ordering and delivery platform for a fitness-focused kitchen in Kothrud, Pune.

Every dish is tagged by **fitness goal** (fat loss · muscle gain · basic fitness) and by
**timing** (pre-workout · post-workout · meal), with calories and macros on every plate.

Payment is **cash on delivery only**. Customers order as guests — no account needed.

---

## Quick start

```bash
npm run install:all   # installs root, client and server
npm run dev           # API on :4000, client on :5173
```

Open **http://localhost:5173**.

No database setup is needed: with `MONGODB_URI` unset, an in-memory MongoDB starts
automatically and seeds itself. Point `MONGODB_URI` at Atlas when you want persistence —
nothing else changes.

### Staff sign-in — http://localhost:5173/login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@healthyeats.in` | `admin123` |
| Chef | `chef@healthyeats.in` | `chef123` |

Both are seeded server-side and **cannot be registered**. Change them via `server/.env`
before this goes anywhere real.

---

## The three screens

| Screen | Route | Who |
|---|---|---|
| Storefront, menu, checkout, tracking | `/`, `/menu`, `/checkout`, `/track/:orderNumber` | anyone |
| Kitchen display | `/kitchen` | chef, admin |
| Monitoring dashboard | `/admin` | **admin only** |

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

React + Vite · TypeScript · Tailwind · shadcn/ui · TanStack Query · Zustand · Leaflet
Node + Express · Mongoose · Zod · Socket.IO · JWT in httpOnly cookies

`shared/` holds the Zod schemas and types used by **both** client and server, so validation
can never drift between them.

```
client/   React app
server/   Express API
shared/   Zod schemas + types (single source of truth)
design/   design handoff
```

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | client + server together |
| `npm run build` | production build of both |
| `npm run format` | Prettier across the repo |

---

## Before this goes live

See `CLAUDE.md` for the full decision log. Two items need a decision:

1. **Order-number privacy** — tracking is public by 4-digit order number, per the design.
   Enumerable. Lengthen the number or add a phone check first (§10b).
2. **Real menu** — 12 dishes are seeded from the design; three have estimated prices and
   macros (§8b).

Also: set `JWT_SECRET` and change both staff passwords. The server refuses to boot in
production with the dev defaults.
