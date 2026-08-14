# Healthy Eats — Project Guide

> **This file is the living source of truth for architecture and product decisions.**
> Every significant decision or change made during the project must be appended to the
> **Decision Log** at the bottom, with a date and a reason. Do not let this file go stale.

---

## 1. What this is

**Healthy Eats** is a fitness-focused restaurant with an online ordering and delivery platform.

**The USP:** every dish is tagged along two axes —

| Axis | Values |
|---|---|
| **Fitness goal** | weight loss · lean body · muscle gain |
| **Timing** | pre-workout · post-workout · meal |

Nutrition data (kcal + protein/carbs/fat) is **first-class from day one**. It drives the menu
taxonomy, the filters, and the dish cards. This is what separates the product from a generic
restaurant site — never treat it as an add-on.

Visual reference for layout feel: `mrspringmrsfresh.com` (full-bleed food photography, strong
brand moment, prominent "View Menu" section). Healthy Eats goes further: it is a working
delivery platform, not a brochure site.

**Three roles, three dashboards:** customer, chef, admin.

---

## 2. Stack (confirmed by user, 2026-08-14)

| Layer | Choice |
|---|---|
| Frontend | **React + Vite** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| UI components | **shadcn/ui** |
| Backend | **Node.js + Express** |
| API validation | **Zod** |
| Database | **MongoDB + Mongoose** |
| Auth | Protected admin authentication |
| HTTP client | **fetch** (no axios) |
| Testing | **Vitest** (unit) + **Playwright** (e2e) |
| Code quality | **ESLint + Prettier** |
| Version control | **Git + GitHub** |
| DB hosting | **MongoDB Atlas** |
| Frontend hosting | **Vercel** |
| Backend hosting | **Render / Railway** |

### Scope note

The user initially said "no backend for now," then supplied the full backend stack above.
**Resolution:** build the real backend, but keep it lean — only the endpoints the frontend
actually needs. No speculative API surface.

---

## 3. Product decisions (confirmed)

| Decision | Choice |
|---|---|
| Theme | **Fresh Citrus** — light, lively, happy. Explicitly *not* dark. |
| Currency | **₹ INR** |
| Payment | **Cash on Delivery only** |
| Checkout | Standard: cart → address → summary → place → live tracking |
| Cancel behaviour | Admin cancels order, **then picks which dish(es) sold out today** |
| Order closeout | **Admin** marks delivered (not chef, no driver role) |
| Chef dashboard | Deliberately minimal — **one button per ticket** |
| Membership / meal plans | **Out of scope for now.** Business will launch it later; leave room in the data model. |
| Menu content | **Supplied by the user.** Do not invent dishes. See §8. |

---

## 4. Design system — derived from the user's landing design

> ⚠️ **"Fresh Citrus" is dead.** The user supplied a landing design (design screenshots) that uses
> a completely different palette and typeface. The design wins. Tokens below are the real ones,
> and they live in `client/src/index.css`.

Light mode only.

```
cream       #F2F0E9   page background
surface     #FBFAF6   cards
forest      #17281F   dark bands — hero, how-it-works
forest-deep #132119   footer
green       #1E5E43   CTA fill — Order Now, Add to order
terracotta  #BE8A5C   accent — step numbers, dots, links
badge       #EDE4D6   goal badge fill (text #96683C)
text        #1A2620
muted       #6E736A
border      #DCD8CC
placeholder #DED9CD   dish image slots until photography lands
```

- **Type:** **Playfair Display** (high-contrast serif — all display headings, prices, dish names)
  + **Inter** (body, UI, labels). The serif is the whole character of the brand.
- **Shape:** small radii (`--radius: 0.5rem`) on cards; **fully-round pills** on buttons only.
  The design is restrained and editorial, *not* the rounded-friendly look originally planned.
- **Macros:** big figure over an uppercase letterspaced caption (`820` / `KCAL`), all one ink.
  No per-macro colour — the design keeps the row monochrome.
- **Goal badges:** tan pill, uppercase letterspaced, terracotta-brown text. No dots.
- **Section eyebrows:** `.eyebrow` utility — 11px, 600, 0.16em tracking, uppercase.
- **Motion:** subtle only. Hover shadows, 500ms image scale on collection tiles, arrow nudge on
  the menu CTA. Respects `prefers-reduced-motion`.
- Tokens live once in CSS custom properties, consumed through the Tailwind theme.
  **Never hardcode a hex value in a component.**

---

## 5. Order lifecycle

```
   customer          admin                    chef          admin
   ────────          ─────                    ────          ─────
   PLACED ──────────▶ [Accept] ─▶ PREPARING ─▶ [Ready] ─▶ READY ─▶ [Delivered] ─▶ DELIVERED
      │                                │
      └──▶ [Cancel] ◀──────────────────┘
                │
                └─▶ CANCELLED  +  admin selects which dish(es) sold out
                                  → those dishes show "Unavailable today" on the public menu
                                  → auto-resets at next calendar day
```

Rules:
- Cancel is allowed from `placed` and `preparing`. **Never after `ready`.**
- `PREPARING` is entered **automatically** when admin accepts — this is what keeps the chef
  screen to a single button.
- Sold-out dishes are **greyed with an "Unavailable today" ribbon, never hidden**, so customers
  still see the full range.

---

## 6. Architecture principles

1. **Shared types.** TypeScript types and Zod schemas are defined once and used by both client
   and server. The Zod schema is the single source of truth for validation on both sides.
2. **Thin services layer on the client.** All API calls go through `services/*`. Components
   never call `fetch` directly.
3. **Lean API.** Build endpoints the frontend needs. Nothing speculative.
4. **Menu data is content, not code.** The dish list must be replaceable without touching UI.
5. **Consistency over cleverness.** The user explicitly asked for consistent architecture
   throughout — match existing patterns rather than introducing new ones per feature.

---

## 7. Dashboards

> **There is exactly ONE monitoring dashboard, and it belongs to admin.**
> All order monitoring and all money/revenue monitoring live in admin and nowhere else.
> Chef and customer screens are **operational views, not monitoring views** — they show only
> what that person needs to act on right now. Do not add stats, totals, charts, counts, or
> earnings to the chef or customer screens.

**Customer** — live order tracking (animated status timeline + ETA), order history with
one-tap reorder, saved addresses, profile. **No analytics or aggregate figures.**

**Chef** (`/kitchen`) — spartan by design. Ticket grid, oldest first. Order number, items with
quantities, elapsed-time counter shifting amber→red as a ticket ages. **One button: READY TO GO.**
No nav chrome. Oversized type for across-the-kitchen legibility.
**No revenue, no order counts, no performance stats.**

**Admin** — four screens:
- *Overview* — today's revenue, order count, average order value, pending count, 7-day chart, live feed.
- *Orders* — filterable by status. `placed` rows get **Accept** / **Cancel** (cancel dialog picks
  sold-out dishes + reason). `ready` rows get **Mark Delivered**.
- *Revenue* — today/week/month, revenue by dish, revenue by goal category, value lost to cancellations.
- *Menu* — availability manager, sold-out list, daily reset.

---

## 8. Menu content — needed from user

Do **not** invent dishes. The user is supplying the real menu. Required fields per dish:

| Field | Notes |
|---|---|
| Name | |
| Description | 1–2 lines |
| Price | ₹ |
| Category | e.g. Bowls, Salads, Wraps, Shakes |
| Calories | kcal |
| Protein / Carbs / Fat | grams |
| Goal tag(s) | weight loss · lean body · muscle gain |
| Timing tag(s) | pre-workout · post-workout · meal |
| Diet tag(s) | veg · non-veg · vegan · gluten-free |
| Bestseller? | drives the homepage top carousel |
| Today's special? | drives the specials section |
| Photo | one per dish |

Also wanted: logo / name treatment, tagline, delivery fee and radius, contact details, address,
brand photos.

## 8b. Values needing correction from the user

12 dishes are seeded in `server/src/seed.ts`, all transcribed from the design screenshots.
**Three sit in the cut-off bottom row of the menu screenshot**, so their price and macros are
estimates — the only invented numbers in the project. Each is marked `ESTIMATED` in the file:

| Dish | Needs |
|---|---|
| Malai Paneer Tikka | real price + kcal/protein/carbs/fat |
| Butter Chicken | real price + kcal/protein/carbs/fat |
| Grilled Chicken Salad | real price + kcal/protein/carbs/fat |

Also unverified: the veg/non-veg mark on Malai Paneer Tikka (assumed veg), and carbs/fat for the
four carousel dishes, whose cards show only kcal and protein.

The landing page's "77 meals" is the full catalogue, still to come; the menu's "12 dishes today"
is what is on the pass. Both figures are computed from real data, so they currently both read 12.

---

## 8a. Landing page design reference

The user has a Claude design at:
`https://claude.ai/design/p/ed87b683-b97e-45dc-83c8-8c3e30add231?file=Healthy+Eats+-+Landing.dc.html`

**This URL 403s for Claude Code** — it is private to the user's claude.ai session and cannot be
fetched with WebFetch. The source must be handed over directly (saved into
`design/` in the repo, pasted, or re-shared as a public artifact link).
Once received, it is the visual reference for the landing page; enhancement is permitted.

## 9. Homepage section order (user-specified)

1. **Bestsellers carousel** — full-bleed, at the very top, *above* the brand. Auto-advancing **and** drag/swipe.
2. **Brand block** — "HEALTHY EATS" wordmark as a title card.
3. **Today's Specials** — visually distinct from the carousel (asymmetric editorial grid, date stamp).
4. ~~Goal picker~~ — **CUT** by user ("if we need it we will add it later on"). Goal filtering
   lives on the menu page only.
5. **View Menu** — modeled on the reference site: full-width, photographic, one strong CTA.
6. How it works → Why Healthy Eats → Contact → Footer.

---

## 10. Access control — HARD RULE

**There is exactly ONE admin account. Nobody else can reach the admin window.**

- The admin account is **seeded, never registerable**. There is no admin signup route, and
  `role` can never be set from a request body.
- Admin routes are guarded **server-side** by role middleware. Hiding the UI is not enough —
  a direct API call from a logged-in chef or customer must return 403.
- The chef cannot see revenue, order counts, or any monitoring data. The customer can see
  **only their own orders**, never anyone else's.
- Ownership is checked on every order read: a customer requesting an order that isn't theirs
  gets 403, not the order.

## 10a. Resolved by assumption — override any of these if wrong

The user asked for a working prototype rather than more questions, so these were decided:

| Item | Decision | Rationale |
|---|---|---|
| Repo layout | One repo: `client/` + `server/` + `shared/` | User: "decide it later, I just want a working prototype." This forecloses nothing. |
| Real-time | **Socket.IO** | User-confirmed. |
| Admin account | Single seeded account, credentials from env | User-confirmed, stated three times. |
| Chef account | Single seeded account. No self-signup. | Someone must be authenticated to mark tickets ready. |
| Customer accounts | ~~Email + password signup/login~~ → **GUEST CHECKOUT** | **Overridden by the checkout design**, which reads "CHECKOUT · NO ACCOUNT NEEDED" and "Guest checkout — we only keep this for today's delivery". Orders are tracked by order number, not by account. |
| Client data layer | TanStack Query (server state) + Zustand (cart) | Keeps three screens in sync under Socket.IO invalidation. Uses `fetch` underneath as specified. |
| Local database | `mongodb-memory-server` when `MONGODB_URI` is unset | Prototype runs with zero setup; real Mongoose models throughout, so switching to Atlas is one env var. |
| Dish images | Local `client/public/` for now | Cloudinary/S3 can come with admin uploads later. |

Still open, non-blocking:

- [ ] **Dish image uploads** from the admin panel — needed before real content management.

---

## 11. Working agreement

- **Confirm the stack and approach before writing code.** Do not begin scaffolding on assumption.
- Record every significant decision in the Decision Log below.
- Keep architecture consistent across the whole project — this was an explicit user request.

---

## 12. Decision Log

Append newest at the bottom. Format: date — decision — reason.

| Date | Decision | Reason |
|---|---|---|
| 2026-08-14 | Project scoped: fitness restaurant + delivery platform, 3 role dashboards | Initial brief |
| 2026-08-14 | Nutrition/macros + two-axis goal×timing taxonomy made core to the data model | It is the business USP; retrofitting later would force a data-model rework |
| 2026-08-14 | Theme = Fresh Citrus, light mode only | User rejected all three dark/muted proposals: "should feel lively and happy" |
| 2026-08-14 | Cancel = reject order **and** mark selected dish(es) sold out for the day | User's definition of "unavailable"; admin picks which dish ran out |
| 2026-08-14 | Admin marks delivered; no driver role | User choice — keeps it to three dashboards |
| 2026-08-14 | Membership/subscription model deferred | Business will launch it later |
| 2026-08-14 | Payment = COD only, ₹ INR | User choice |
| 2026-08-14 | ~~Next.js App Router~~ **superseded** → React + Vite | User supplied a full explicit stack; Next.js was my assumption, not their choice |
| 2026-08-14 | ~~No backend, mock data layer~~ **superseded** → real Express + MongoDB, kept lean | User's stack list includes Express, Mongoose, Atlas, and backend hosting |
| 2026-08-14 | Adopted working agreement: confirm stack before building, log decisions here | User feedback after I began scaffolding on assumption |
| 2026-08-14 | **Exactly one monitoring dashboard — admin only.** Order + money monitoring appear nowhere else. Chef and customer screens are operational, not analytical. | User instruction |
| 2026-08-14 | **Exactly one admin account, seeded and non-registerable. Enforced server-side.** | User instruction, stated repeatedly — treat as a hard requirement, not a UI preference |
| 2026-08-14 | Socket.IO for real-time order updates | User choice |
| 2026-08-14 | Repo = one repo, `client/` + `server/` + `shared/` | User deferred; prototype-first. Reversible. |
| 2026-08-14 | TanStack Query + Zustand on the client | Decided by me — needed to keep three screens in sync; `fetch` still the transport |
| 2026-08-14 | `mongodb-memory-server` fallback when `MONGODB_URI` is unset | Prototype must run with zero setup; Atlas is a one-env-var switch |
| 2026-08-14 | Homepage **goal picker section cut** | User: "if we need it we will add it later on" |
| 2026-08-14 | Landing page to follow the user's Claude design; URL is private/403, so source comes via screenshots | Design is not machine-readable from the link |
| 2026-08-14 | **Palette replaced: Fresh Citrus → cream/forest/terracotta** | The user's landing design uses it; design beats the earlier proposal |
| 2026-08-14 | **Display face = Playfair Display** (was Bricolage Grotesque) | Design uses a high-contrast serif throughout |
| 2026-08-14 | **Goals renamed: `fat-loss`, `muscle-gain`, `basic-fitness`** (was weight-loss/lean-body/muscle-gain) | Badge names read off the design |
| 2026-08-14 | **Goal-collections section reinstated** after being cut | It appears in the design ("Pick the plate that matches the day") |
| 2026-08-14 | Brand facts (address, phone, FSSAI, hours, delivery areas, tagline) captured in `shared/index.ts` `BRAND` | Read off the design footer — single source for the whole app |
| 2026-08-14 | Added `sortOrder` to Dish | The bestsellers rail is merchandised, not alphabetical |
| 2026-08-14 | Added mobile nav drawer (not in design) | Design showed desktop only; without it phones had no navigation at all |
| 2026-08-14 | **Guest checkout — customers do NOT log in** | Checkout design reads "NO ACCOUNT NEEDED" / "Guest checkout". Supersedes the earlier customer-accounts decision. |
| 2026-08-14 | Added **packaging fee ₹15** as a separate line | Appears in the checkout design's order summary |
| 2026-08-14 | Added `ingredients` to Dish (short line) alongside `description` (long copy) | Menu cards show a terse ingredient list; specials cards show fuller copy |
| 2026-08-14 | Cart = Zustand + localStorage, purely client-side | No account needed; server still recomputes every total from the DB on order placement |
| 2026-08-14 | Seeded **12 dishes** transcribed from the menu design | Matches the design's "12 DISHES TODAY". See §8b for the three with estimated figures. |
| 2026-08-14 | Order tracking is **public by order number** (`/track/HE-1234`) | Tracking design says "type the order number on the site". ⚠️ See §10b — privacy trade-off. |
| 2026-08-14 | Map = **Leaflet + OpenStreetMap tiles** | Checkout design has a draggable pin. OSM needs no API key or billing account. |
| 2026-08-14 | Added `lat`/`lng` to address | The dropped pin is what the rider actually navigates to |
| 2026-08-14 | Checkout and tracking use a **stripped header, no site chrome** | Both designs drop the nav so nothing competes with completing/reading the order |
| 2026-08-14 | **Kitchen display is DARK** — the only dark screen in the product | The chef design is dark, and it is right for a wall-mounted screen read across a bright kitchen. Explicit exception to light-mode-only. |
| 2026-08-14 | Kitchen has three columns: **Incoming / Cooking / Ready** | From the chef design. Incoming = `placed` (visible but Ready button DISABLED until admin accepts), Cooking = `preparing`, Ready = `ready`. Keeps the chef to one button while matching the layout. |
| 2026-08-14 | Added `notes` to Order + a kitchen-note field at checkout | The chef design shows allergy notes ("No peanut — allergy") on tickets; there was no field for them |
| 2026-08-14 | Login page designed from scratch | No design was supplied; built from existing tokens. No signup link — staff accounts are seeded only. |
| 2026-08-14 | Money monitoring lives on **admin → Order history** | The design's sidebar has no dedicated revenue item, but revenue monitoring was an explicit requirement. Folded in there rather than inventing a nav item. |
| 2026-08-14 | Admin → Settings is **read-only** | Sidebar shows it; no screen was designed. Surfaces real config rather than fake controls. |
| 2026-08-14 | About page built from the 3 About screenshots; `HowDeliveryWorks` gained a light `card` variant | The block appears on both Home (dark band) and About (light card) |
| 2026-08-14 | Contact page designed from scratch, **with no message form** | No design was supplied. A form with no endpoint would silently discard messages — worse than not offering one. Phone/Instagram/map instead. |
| 2026-08-14 | **Palette darkened for WCAG AA**: added `--he-terracotta-text` (#8A6443), `--he-terracotta-dark` → #885E36, `--he-muted` → #6A6F66, placeholder caption → #5A5F56 | The design's terracotta only reached 2.9:1 on cream — well under the 4.5:1 AA needs for small text. Hue held; only lightness moved. `--he-terracotta` is unchanged and still used for decoration and on-dark text. |

## 13. Accessibility status

Audited across all 11 pages (public + admin + kitchen) at 390 / 768 / 1440 px:

- ✅ every image has `alt`, every control has an accessible name
- ✅ exactly one `h1` per page, no skipped heading levels
- ✅ no horizontal overflow at any breakpoint
- ✅ every form input has an associated `<label>`
- ✅ no console or page errors
- ✅ all body text meets **WCAG AA 4.5:1** after the palette adjustment above
- ✅ `prefers-reduced-motion` honoured globally
- ✅ visible focus ring on every interactive element

Re-run the audit any time with `$CLAUDE_JOB_DIR/tmp/audit.py` and `contrast2.py` (Playwright).

## 10b. Known privacy trade-off — decide before launch

Order numbers are 4 digits (`HE-4821`) and `/api/orders/track/:orderNumber` is unauthenticated,
because the tracking design says customers can "type the order number on the site". A determined
person could enumerate numbers and read a customer's **name, phone and address**.

Fine for a prototype. Before real customers use it, do one of:
- lengthen/randomise the order number, or
- require the phone's last 4 digits as a second factor on the tracking lookup.

Flagged in code at `server/src/routes/orders.ts`.
