# Healthy Eats — Project Guide

> **This file is the living source of truth for architecture and product decisions.**
> Every significant decision or change made during the project must be appended to the
> **Decision Log** at the bottom, with a date and a reason. Do not let this file go stale.

---

## 1. What this is

**Healthy Eats** is a fitness-focused restaurant with an online ordering and delivery platform.

**The USP:** every dish is tagged along two axes —

| Axis             | Values                                |
| ---------------- | ------------------------------------- |
| **Fitness goal** | weight loss · lean body · muscle gain |
| **Timing**       | pre-workout · post-workout · meal     |

Nutrition data (kcal + protein/carbs/fat) is **first-class from day one**. It drives the menu
taxonomy, the filters, and the dish cards. This is what separates the product from a generic
restaurant site — never treat it as an add-on.

Visual reference for layout feel: `mrspringmrsfresh.com` (full-bleed food photography, strong
brand moment, prominent "View Menu" section). Healthy Eats goes further: it is a working
delivery platform, not a brochure site.

**Three roles, three dashboards:** customer, chef, admin.

---

## 2. Stack (confirmed by user, 2026-08-14)

| Layer            | Choice                                   |
| ---------------- | ---------------------------------------- |
| Frontend         | **React + Vite**                         |
| Language         | **JavaScript** (no TypeScript)           |
| Styling          | **Tailwind CSS**                         |
| UI components    | **shadcn/ui**                            |
| Backend          | **Node.js + Express**                    |
| API validation   | **Zod** (runtime only — see §2a)         |
| Database         | **MongoDB + Mongoose**                   |
| Auth             | Protected admin authentication           |
| HTTP client      | **fetch** (no axios)                     |
| Testing          | **Vitest** (unit) + **Playwright** (e2e) |
| Code quality     | **oxlint + Prettier**                    |
| Version control  | **Git + GitHub**                         |
| DB hosting       | **MongoDB Atlas**                        |
| Frontend hosting | **Vercel**                               |
| Backend hosting  | **Render / Railway**                     |

### Scope note

The user initially said "no backend for now," then supplied the full backend stack above.
**Resolution:** build the real backend, but keep it lean — only the endpoints the frontend
actually needs. No speculative API surface.

## 2a. TypeScript → JavaScript (2026-09-13)

**Superseded.** The user changed direction: the stack is now **JavaScript + React only** —
no `.ts`/`.tsx`, no `tsc`, no `tsconfig.json`, no `@types/*`. Nothing else about the project
changed; this was a mechanical conversion, not a rewrite.

- **What replaces compile-time types: nothing — Zod at runtime only.** No JSDoc, no PropTypes.
  Zod already validates every request at the API boundary, which is where bad data actually
  enters. Editor autocomplete on API response shapes is gone; accepted as the cost of this
  choice.
- **Repo layout renamed to match:** `client/` → `frontend/`, `server/` → `backend/`.
  `shared/` is unchanged in name or role — still the single Zod-schema source of truth, still
  resolved by the `@shared` alias on the frontend and by relative imports on the backend.
- Converted mechanically with **ts-blank-space** (blanks type syntax to whitespace using the
  TypeScript compiler's own parser) across all 66 `.ts`/`.tsx`/`.mts` files. Both the client and
  server packages had `erasableSyntaxOnly` enforced (or turned out to satisfy it — the backend
  had no tsconfig setting requiring it, but had zero enums/decorators/namespaces regardless),
  so the stripper found **zero non-erasable constructs** — nothing needed a real rewrite. Every
  file's semantic equivalence to its pre-conversion source was verified with a
  normalized-transpile diff (both old and new put through the same TS printer); every
  divergence found was either a deliberate change (below) or a confirmed no-op artifact
  (a trailing comma, redundant parens, a stray empty statement).
- Two guarantees the type system used to carry, restored as runtime checks instead of lost
  outright: `backend/src/middleware/auth.js`'s decoded JWT payload is now validated against a
  new `authPayloadSchema` in `shared/index.js` before being trusted (previously a compile-time
  `as AuthPayload` cast with no runtime check); the label maps' `Record<Goal, string>`-style
  exhaustiveness guarantee is **not** restored (a missing key is now a silent `undefined`) — no
  test exercised this either way, so it was left as an accepted gap rather than invented.
- **Production cross-origin wiring added as part of the same pass** (found while migrating,
  not part of the original ask, but a real gap): the backend already supported split-domain
  hosting (`CLIENT_ORIGIN`, CORS with credentials, `sameSite: 'none'` in prod), but the frontend
  hardcoded a relative `/api` path and an origin-relative Socket.IO connection, which only ever
  worked because the Vite dev proxy papered over it. `frontend/src/lib/api.js` and `lib/socket.js`
  now read `VITE_API_URL` / `VITE_SOCKET_URL`, both empty by default (= today's behaviour
  unchanged) — see `frontend/.env.example`. Needed for the Vercel + Render/Railway split this
  file already specifies.
- **Four pre-existing bugs fixed in the same pass**, found during the migration's exploration,
  unrelated to the stack change itself: a corrupted `timeline` subdocument in the `Order` model
  (a copy-paste artifact — a stray `notes` field and a duplicated `status` pasted inside the
  array element; Zod stripped it on the wire, so it was never visible to API consumers); the
  root `npm run seed` script, which called a `seed` script that never existed in
  `backend/package.json` (seeding already happens automatically at boot — the script was
  deleted rather than wired up); dead test tooling (`vitest`, `jsdom`, `@testing-library/*`)
  sitting in `frontend/package.json` with no test script or config ever using them; and a
  Playwright `webServer` that waited only on the frontend's port while
  `access-control.spec.js` hits the backend directly — an intermittent startup race, fixed by
  waiting on both.

## 2b. `shared/` duplicated into each package, no root folder (2026-09-13, revised 2026-09-16)

The user is hosting `frontend/` and `backend/` on **separate services** (§2, Vercel +
Render/Railway). A shared sibling folder outside both is a problem for that: most hosts either
don't check out the whole monorepo when a service's root directory is a subfolder, or don't
guarantee it, so `frontend/` and `backend/` each needed to be **fully self-contained** —
buildable and runnable with zero access to anything outside their own directory.

**Resolution: `shared/index.js` is duplicated into `frontend/src/shared/index.js` and
`backend/src/shared/index.js`**, both committed as ordinary source files. Neither package
imports a sibling `shared/` folder — `frontend/vite.config.js`'s `@shared` alias and every
backend relative import resolve to the local copy. Verified by copying `backend/` alone (no
`frontend/`, nothing else) to a scratch directory and booting it standalone, and likewise
building `frontend/` alone — both worked with zero access to anything outside their own folder.

- **There is no root `shared/` folder or canonical source file, and no `sync-shared` script**
  (both removed 2026-09-16). Since the two packages are hosted, built and deployed completely
  separately anyway, a repo-root "canonical" copy that neither of them ever reads at
  build/run time added a sync step without adding a real safety property — the user asked for
  it gone so that the split is unambiguous: everything either package needs lives inside it.
- **Workflow: hand-edit one copy, then copy it byte-for-byte over the other.** There is no
  script for this — the file is small and edits are infrequent enough that automating it
  would be another moving part for no real benefit.
- **`tests/unit/shared-sync.test.js`** now diffs `frontend/src/shared/index.js` directly
  against `backend/src/shared/index.js` (previously each against the deleted root copy) —
  still fails loudly the moment the two disagree.

---

## 3. Product decisions (confirmed)

| Decision                | Choice                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Theme                   | **Fresh Citrus** — light, lively, happy. Explicitly _not_ dark.                        |
| Currency                | **₹ INR**                                                                              |
| Payment                 | **Cash on Delivery only**                                                              |
| Checkout                | Standard: cart → address → summary → place → live tracking                             |
| Cancel behaviour        | Admin cancels order, **then picks which dish(es) sold out today**                      |
| Order closeout          | **Assigned driver** marks delivered; **admin** only for orders with no driver assigned (§17) |
| Chef dashboard          | Deliberately minimal — **one button per ticket**                                       |
| Membership / meal plans | **Out of scope for now.** Business will launch it later; leave room in the data model. |
| Menu content            | **Supplied by the user.** Do not invent dishes. See §8.                                |

---

## 4. Design system — derived from the user's landing design

> ⚠️ **"Fresh Citrus" is dead.** The user supplied a landing design (design screenshots) that uses
> a completely different palette and typeface. The design wins. Tokens below are the real ones,
> and they live in `frontend/src/index.css`.

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
  - **Inter** (body, UI, labels). The serif is the whole character of the brand.
- **Shape:** small radii (`--radius: 0.5rem`) on cards; **fully-round pills** on buttons only.
  The design is restrained and editorial, _not_ the rounded-friendly look originally planned.
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
   customer          admin                    chef          admin / driver
   ────────          ─────                    ────          ──────────────
   PLACED ──────────▶ [Accept] ─▶ PREPARING ─▶ [Ready] ─▶ READY ─▶ [Delivered] ─▶ DELIVERED
      │                                │                     │
      └──▶ [Cancel] ◀──────────────────┘                     │
                │                                            ▼
                │                              admin [Assign driver] (READY only)
                │                                            │
                │                                            ▼
                │                              driver [Accept] ─▶ [Mark delivered]
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
- A driver can only be assigned once an order is `READY` (§17). Assignment does not change
  `status` — it is metadata on the order, not a new state. Once assigned, only that driver
  (not admin) can mark it delivered; admin closes out only orders nobody is assigned to.

---

## 6. Architecture principles

1. **Shared contract.** Zod schemas are the single source of truth for validation on both
   sides, committed identically into `frontend/src/shared/index.js` and
   `backend/src/shared/index.js` — there is no root `shared/` folder (§2b). (Until 2026-09-13
   this also carried shared TypeScript types; see §2a — the schemas remain, the types don't.)
2. **Thin services layer on the client.** All API calls go through `frontend/src/lib/api.js`.
   Components never call `fetch` directly.
3. **Lean API.** Build endpoints the frontend needs. Nothing speculative.
4. **Menu data is content, not code.** The dish list must be replaceable without touching UI.
5. **Consistency over cleverness.** The user explicitly asked for consistent architecture
   throughout — match existing patterns rather than introducing new ones per feature.

---

## 7. Dashboards

> **There is exactly ONE monitoring dashboard, and it belongs to admin.**
> All order monitoring and all money/revenue monitoring live in admin and nowhere else.
> Chef, driver and customer screens are **operational views, not monitoring views** — they
> show only what that person needs to act on right now. Do not add stats, totals, charts,
> counts, or earnings to the chef, driver or customer screens.

**Customer** — live order tracking (animated status timeline + ETA), order history with
one-tap reorder, saved addresses, profile. **No analytics or aggregate figures.**

**Chef** (`/kitchen`) — spartan by design. Ticket grid, oldest first. Order number, items with
quantities, elapsed-time counter shifting amber→red as a ticket ages. **One button: READY TO GO.**
No nav chrome. Oversized type for across-the-kitchen legibility.
**No revenue, no order counts, no performance stats.**

**Driver** (`/driver`, added 2026-09-16, see §17) — a phone-first, light-token screen (not
dark like kitchen — a phone read outdoors, not a wall-mounted display). Shows only the READY
orders assigned to that driver: customer, address, a tap-to-call link, a maps link, items,
kitchen notes, and the cash to collect. **Two buttons in sequence per order: Accept, then
Mark delivered** (delivered needs a second tap to confirm). No stats, no earnings, no history.

**Admin** — four screens, plus Drivers (§17):

- _Overview_ — today's revenue, order count, average order value, pending count, 7-day chart, live feed.
- _Orders_ — filterable by status. `placed` rows get **Accept** / **Cancel** (cancel dialog picks
  sold-out dishes + reason). `ready` rows get a driver-assign dropdown and **Mark Delivered**
  when no driver is assigned; once a driver is assigned, Mark Delivered is replaced by an
  assignment chip and Unassign — the driver closes it out instead.
- _Revenue_ — today/week/month, revenue by dish, revenue by goal category, value lost to cancellations.
- _Menu_ — availability manager, sold-out list, daily reset.
- _Drivers_ — the only place driver accounts are created (name, phone, email, password);
  deactivate/reactivate toggle.

---

## 8. Menu content — needed from user

Do **not** invent dishes. The user is supplying the real menu. Required fields per dish:

| Field                 | Notes                                 |
| --------------------- | ------------------------------------- |
| Name                  |                                       |
| Description           | 1–2 lines                             |
| Price                 | ₹                                     |
| Category              | e.g. Bowls, Salads, Wraps, Shakes     |
| Calories              | kcal                                  |
| Protein / Carbs / Fat | grams                                 |
| Goal tag(s)           | weight loss · lean body · muscle gain |
| Timing tag(s)         | pre-workout · post-workout · meal     |
| Diet tag(s)           | veg · non-veg · vegan · gluten-free   |
| Bestseller?           | drives the homepage top carousel      |
| Today's special?      | drives the specials section           |
| Photo                 | one per dish                          |

Also wanted: logo / name treatment, tagline, delivery fee and radius, contact details, address,
brand photos.

## 8b. Real menu — LOADED, with two open questions

The kitchen's printed menu poster (`design/Screenshot 2026-08-14 030539.png`) has been
transcribed in full into `backend/src/seed.js`: **104 dishes + 15 add-ons = 119 items**.

Counts match the website design exactly, which confirms the design was drawn from this menu:

| Section                 | Count  | Design said  |
| ----------------------- | ------ | ------------ |
| Fat Loss                | 28     | 28 ✓         |
| Muscle Gain             | 28     | 28 ✓         |
| Basic Fitness           | 21     | 21 ✓         |
| **Goal packages total** | **77** | "77 meals" ✓ |
| Indian & Tandoor        | 19     | 19 ✓         |
| Salads & Steam          | 8      | 8 ✓          |

### ⚠️ Open question 1 — the brand does not match

The poster reads **"Fitness Diet Hub & Kitchen"**, delivering **"Across Talegaon Dabhade"**.
The website design says **"Healthy Eats"**, Kothrud, Pune, with a Kothrud address, a Pune
phone number and Kothrud/Baner/Viman Nagar/Hinjewadi delivery.

These are a different name and a different town (Talegaon Dabhade is ~35 km from Kothrud).
The site currently uses the **Healthy Eats / Kothrud** branding from the design. If the real
business is Fitness Diet Hub & Kitchen in Talegaon, `BRAND` in `shared/index.js` is the single
place to change — name, address, phone, delivery areas and hours all read from it.

### ⚠️ Open question 2 — no macros anywhere

The poster carries **no calorie or macro figures**, and macros-on-every-plate is the product's
stated USP. `nutrition` is therefore **optional** in the schema, and the UI renders
"Macros on request" rather than fabricated numbers. Inventing them would be actively harmful —
customers track protein off these figures.

Supply real macros and they appear everywhere automatically.

### Smaller things worth a human check

- **Veg / non-veg is inferred from dish names** (chicken, fish, mutton, egg, keema, sukka,
  omelette → non-veg; "Soy Keema" hand-corrected to veg). 37 of 119 are marked non-veg.
- **Descriptions and ingredient lines are empty** — the poster has none.
- Poster numbering skips 78–84 and 88–89; those items simply are not on it.
- Split-price add-ons ("Grilled Chicken 100/50 g — ₹119/59") are seeded at the 100 g price only.

## 9. Homepage section order (user-specified)

1. **Bestsellers carousel** — full-bleed, at the very top, _above_ the brand. Auto-advancing **and** drag/swipe.
2. **Brand block** — "HEALTHY EATS" wordmark as a title card.
3. **Today's Specials** — visually distinct from the carousel (asymmetric editorial grid, date stamp).
4. ~~Goal picker~~ — **CUT** by user ("if we need it we will add it later on"). Goal filtering
   lives on the menu page only.
5. **View Menu** — modeled on the reference site: full-width, photographic, one strong CTA.
6. How it works → Why Healthy Eats → Contact → Footer.

---

## 10. Access control — HARD RULE

**There is exactly ONE admin account. Nobody else can reach the admin window.**

- The admin account is **seeded, never registerable**. There is no signup route of any kind
  (customers use guest checkout and never sign in), and `role` can never be set from a request
  body. Admin and chef passwords exist only as bcrypt hashes in env (§18).
- Admin routes are guarded **server-side** by role middleware. Hiding the UI is not enough —
  a direct API call from a logged-in chef, driver or customer must return 403.
- The chef cannot see revenue, order counts, or any monitoring data. The customer can see
  **only their own orders**, never anyone else's.
- Ownership is checked on every order read: a customer requesting an order that isn't theirs
  gets 403, not the order.
- **Each staff role signs in at its own endpoint** — `POST /api/auth/admin/login`,
  `/api/auth/chef/login`, `/api/auth/driver/login` — and each accepts only its own role; the
  generic `/api/auth/login` accepts customers only. Right password at the wrong endpoint gets the
  same 401 as a wrong password, so nothing reveals which role an account has. Matching frontend
  pages: `/admin/login`, `/kitchen/login`, `/driver/login` (`/login` is a chooser), and each
  guarded screen redirects to its own login page (2026-09-16).
- **Driver accounts exist only via admin's `POST /api/drivers` — there is no driver
  self-signup, and `role` is hardcoded server-side there too (§17).** A driver may only read,
  accept or deliver an order that is assigned to them; every other order returns 403, and
  `GET /api/orders/driver` never lists it. Deactivating a driver (`active: false`) blocks a
  fresh login **and** ends every existing session for that driver immediately (§18).

## 10a. Resolved by assumption — override any of these if wrong

The user asked for a working prototype rather than more questions, so these were decided:

| Item              | Decision                                               | Rationale                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo layout       | One repo: `frontend/` + `backend/` + `shared/`         | User: "decide it later, I just want a working prototype." This forecloses nothing.                                                                                                                   |
| Real-time         | **Socket.IO**                                          | User-confirmed.                                                                                                                                                                                      |
| Admin account     | Single seeded account; email + bcrypt password hash from env, synced on every boot (§18) | User-confirmed, stated three times.                                                                                                                                                                  |
| Chef account      | Single seeded account. No self-signup.                 | Someone must be authenticated to mark tickets ready.                                                                                                                                                 |
| Driver accounts   | **Many**, created in-app by admin (not seeded, not self-signup) | User: "each driver would be a unique one." See §17. |
| Customer accounts | ~~Email + password signup/login~~ → **GUEST CHECKOUT** | **Overridden by the checkout design**, which reads "CHECKOUT · NO ACCOUNT NEEDED" and "Guest checkout — we only keep this for today's delivery". Orders are tracked by order number, not by account. |
| Client data layer | TanStack Query (server state) + Zustand (cart)         | Keeps three screens in sync under Socket.IO invalidation. Uses `fetch` underneath as specified.                                                                                                      |
| Local database    | `mongodb-memory-server` when `MONGODB_URI` is unset    | Prototype runs with zero setup; real Mongoose models throughout, so switching to Atlas is one env var. **As of 2026-09-16, `backend/.env` points at the real Atlas cluster** — see §16 and the Decision Log. |
| Dish images       | ~~Local `frontend/public/` for now~~ → **GridFS, free Pexels stock photos** | See §16. Cloudinary/S3 can still come with admin uploads later, for real kitchen photography.                                                                        |

Still open, non-blocking:

- [ ] **Dish image uploads** from the admin panel — needed before real content management (i.e. before swapping stock photos for the kitchen's own).

---

## 11. Working agreement

- **Confirm the stack and approach before writing code.** Do not begin scaffolding on assumption.
- Record every significant decision in the Decision Log below.
- Keep architecture consistent across the whole project — this was an explicit user request.

---

## 12. Decision Log

Append newest at the bottom. Format: date — decision — reason.

| Date       | Decision                                                                                                                                                                                                            | Reason                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-14 | Project scoped: fitness restaurant + delivery platform, 3 role dashboards                                                                                                                                           | Initial brief                                                                                                                                                                                                                                                                                                                      |
| 2026-08-14 | Nutrition/macros + two-axis goal×timing taxonomy made core to the data model                                                                                                                                        | It is the business USP; retrofitting later would force a data-model rework                                                                                                                                                                                                                                                         |
| 2026-08-14 | Theme = Fresh Citrus, light mode only                                                                                                                                                                               | User rejected all three dark/muted proposals: "should feel lively and happy"                                                                                                                                                                                                                                                       |
| 2026-08-14 | Cancel = reject order **and** mark selected dish(es) sold out for the day                                                                                                                                           | User's definition of "unavailable"; admin picks which dish ran out                                                                                                                                                                                                                                                                 |
| 2026-08-14 | Admin marks delivered; no driver role                                                                                                                                                                               | User choice — keeps it to three dashboards                                                                                                                                                                                                                                                                                         |
| 2026-08-14 | Membership/subscription model deferred                                                                                                                                                                              | Business will launch it later                                                                                                                                                                                                                                                                                                      |
| 2026-08-14 | Payment = COD only, ₹ INR                                                                                                                                                                                           | User choice                                                                                                                                                                                                                                                                                                                        |
| 2026-08-14 | ~~Next.js App Router~~ **superseded** → React + Vite                                                                                                                                                                | User supplied a full explicit stack; Next.js was my assumption, not their choice                                                                                                                                                                                                                                                   |
| 2026-08-14 | ~~No backend, mock data layer~~ **superseded** → real Express + MongoDB, kept lean                                                                                                                                  | User's stack list includes Express, Mongoose, Atlas, and backend hosting                                                                                                                                                                                                                                                           |
| 2026-08-14 | Adopted working agreement: confirm stack before building, log decisions here                                                                                                                                        | User feedback after I began scaffolding on assumption                                                                                                                                                                                                                                                                              |
| 2026-08-14 | **Exactly one monitoring dashboard — admin only.** Order + money monitoring appear nowhere else. Chef and customer screens are operational, not analytical.                                                         | User instruction                                                                                                                                                                                                                                                                                                                   |
| 2026-08-14 | **Exactly one admin account, seeded and non-registerable. Enforced server-side.**                                                                                                                                   | User instruction, stated repeatedly — treat as a hard requirement, not a UI preference                                                                                                                                                                                                                                             |
| 2026-08-14 | Socket.IO for real-time order updates                                                                                                                                                                               | User choice                                                                                                                                                                                                                                                                                                                        |
| 2026-08-14 | Repo = one repo, `frontend/` + `backend/` + `shared/`                                                                                                                                                               | User deferred; prototype-first. Reversible.                                                                                                                                                                                                                                                                                        |
| 2026-08-14 | TanStack Query + Zustand on the client                                                                                                                                                                              | Decided by me — needed to keep three screens in sync; `fetch` still the transport                                                                                                                                                                                                                                                  |
| 2026-08-14 | `mongodb-memory-server` fallback when `MONGODB_URI` is unset                                                                                                                                                        | Prototype must run with zero setup; Atlas is a one-env-var switch                                                                                                                                                                                                                                                                  |
| 2026-08-14 | Homepage **goal picker section cut**                                                                                                                                                                                | User: "if we need it we will add it later on"                                                                                                                                                                                                                                                                                      |
| 2026-08-14 | Landing page to follow the user's Claude design; URL is private/403, so source comes via screenshots                                                                                                                | Design is not machine-readable from the link                                                                                                                                                                                                                                                                                       |
| 2026-08-14 | **Palette replaced: Fresh Citrus → cream/forest/terracotta**                                                                                                                                                        | The user's landing design uses it; design beats the earlier proposal                                                                                                                                                                                                                                                               |
| 2026-08-14 | **Display face = Playfair Display** (was Bricolage Grotesque)                                                                                                                                                       | Design uses a high-contrast serif throughout                                                                                                                                                                                                                                                                                       |
| 2026-08-14 | **Goals renamed: `fat-loss`, `muscle-gain`, `basic-fitness`** (was weight-loss/lean-body/muscle-gain)                                                                                                               | Badge names read off the design                                                                                                                                                                                                                                                                                                    |
| 2026-08-14 | **Goal-collections section reinstated** after being cut                                                                                                                                                             | It appears in the design ("Pick the plate that matches the day")                                                                                                                                                                                                                                                                   |
| 2026-08-14 | Brand facts (address, phone, FSSAI, hours, delivery areas, tagline) captured in `shared/index.js` `BRAND`                                                                                                           | Read off the design footer — single source for the whole app                                                                                                                                                                                                                                                                       |
| 2026-08-14 | Added `sortOrder` to Dish                                                                                                                                                                                           | The bestsellers rail is merchandised, not alphabetical                                                                                                                                                                                                                                                                             |
| 2026-08-14 | Added mobile nav drawer (not in design)                                                                                                                                                                             | Design showed desktop only; without it phones had no navigation at all                                                                                                                                                                                                                                                             |
| 2026-08-14 | **Guest checkout — customers do NOT log in**                                                                                                                                                                        | Checkout design reads "NO ACCOUNT NEEDED" / "Guest checkout". Supersedes the earlier customer-accounts decision.                                                                                                                                                                                                                   |
| 2026-08-14 | Added **packaging fee ₹15** as a separate line                                                                                                                                                                      | Appears in the checkout design's order summary                                                                                                                                                                                                                                                                                     |
| 2026-08-14 | Added `ingredients` to Dish (short line) alongside `description` (long copy)                                                                                                                                        | Menu cards show a terse ingredient list; specials cards show fuller copy                                                                                                                                                                                                                                                           |
| 2026-08-14 | Cart = Zustand + localStorage, purely client-side                                                                                                                                                                   | No account needed; server still recomputes every total from the DB on order placement                                                                                                                                                                                                                                              |
| 2026-08-14 | Seeded **12 dishes** transcribed from the menu design                                                                                                                                                               | Matches the design's "12 DISHES TODAY". See §8b for the three with estimated figures.                                                                                                                                                                                                                                              |
| 2026-08-14 | Order tracking is **public by order number** (`/track/HE-1234`)                                                                                                                                                     | Tracking design says "type the order number on the site". ⚠️ See §10b — privacy trade-off.                                                                                                                                                                                                                                         |
| 2026-08-14 | Map = **Leaflet + OpenStreetMap tiles**                                                                                                                                                                             | Checkout design has a draggable pin. OSM needs no API key or billing account.                                                                                                                                                                                                                                                      |
| 2026-08-14 | Added `lat`/`lng` to address                                                                                                                                                                                        | The dropped pin is what the rider actually navigates to                                                                                                                                                                                                                                                                            |
| 2026-08-14 | Checkout and tracking use a **stripped header, no site chrome**                                                                                                                                                     | Both designs drop the nav so nothing competes with completing/reading the order                                                                                                                                                                                                                                                    |
| 2026-08-14 | **Kitchen display is DARK** — the only dark screen in the product                                                                                                                                                   | The chef design is dark, and it is right for a wall-mounted screen read across a bright kitchen. Explicit exception to light-mode-only.                                                                                                                                                                                            |
| 2026-08-14 | Kitchen has three columns: **Incoming / Cooking / Ready**                                                                                                                                                           | From the chef design. Incoming = `placed` (visible but Ready button DISABLED until admin accepts), Cooking = `preparing`, Ready = `ready`. Keeps the chef to one button while matching the layout.                                                                                                                                 |
| 2026-08-14 | Added `notes` to Order + a kitchen-note field at checkout                                                                                                                                                           | The chef design shows allergy notes ("No peanut — allergy") on tickets; there was no field for them                                                                                                                                                                                                                                |
| 2026-08-14 | Login page designed from scratch                                                                                                                                                                                    | No design was supplied; built from existing tokens. No signup link — staff accounts are seeded only.                                                                                                                                                                                                                               |
| 2026-08-14 | Money monitoring lives on **admin → Order history**                                                                                                                                                                 | The design's sidebar has no dedicated revenue item, but revenue monitoring was an explicit requirement. Folded in there rather than inventing a nav item.                                                                                                                                                                          |
| 2026-08-14 | Admin → Settings is **read-only**                                                                                                                                                                                   | Sidebar shows it; no screen was designed. Surfaces real config rather than fake controls.                                                                                                                                                                                                                                          |
| 2026-08-14 | About page built from the 3 About screenshots; `HowDeliveryWorks` gained a light `card` variant                                                                                                                     | The block appears on both Home (dark band) and About (light card)                                                                                                                                                                                                                                                                  |
| 2026-08-14 | Contact page designed from scratch, **with no message form**                                                                                                                                                        | No design was supplied. A form with no endpoint would silently discard messages — worse than not offering one. Phone/Instagram/map instead.                                                                                                                                                                                        |
| 2026-08-14 | **Palette darkened for WCAG AA**: added `--he-terracotta-text` (#8A6443), `--he-terracotta-dark` → #885E36, `--he-muted` → #6A6F66, placeholder caption → #5A5F56                                                   | The design's terracotta only reached 2.9:1 on cream — well under the 4.5:1 AA needs for small text. Hue held; only lightness moved. `--he-terracotta` is unchanged and still used for decoration and on-dark text.                                                                                                                 |
| 2026-08-15 | **Landing-page dish cards wired to the cart**; `CartBar` now renders on Home as well as Menu                                                                                                                        | The bestsellers and specials cards rendered their Add buttons with no `onClick` — dead controls. They now use the same add → `QtyStepper` pattern as `MenuDishCard`. The cart bar came with it: without it a click on the landing page has no visible effect and no route to checkout. Covered by an e2e regression test.          |
| 2026-08-15 | **The checkout pin no longer defaults to the kitchen.** No pin exists until the customer places one                                                                                                                 | On mount the map emitted the kitchen's own coordinates, so any order where nobody touched the map shipped a delivery pin pointing at the restaurant — wrong data that looked deliberate. Absent beats wrong; the UI now says so plainly.                                                                                           |
| 2026-08-15 | **Address search + reverse geocoding added** via OSM Nominatim (`frontend/src/lib/geocode.js`)                                                                                                                      | Dragging from Kothrud was the only way to find an address, and the pin read back as bare coordinates the customer could not verify. Same OSM family as the tiles, so still no API key. ⚠️ Public Nominatim is rate-limited and not for production volume — see §15.                                                                |
| 2026-08-15 | Kitchen coordinates and a **12 km delivery radius** moved into `BRAND` (`geo`, `deliveryRadiusKm`)                                                                                                                  | Brand facts live in one place. Drives the distance readout, the ETA, and the out-of-range notice.                                                                                                                                                                                                                                  |
| 2026-08-15 | An out-of-range pin **warns, never blocks**                                                                                                                                                                         | The kitchen may still want a Hinjewadi order it can service; a hard block silently loses revenue. The customer is told and the kitchen calls to confirm.                                                                                                                                                                           |
| 2026-09-13 | **TypeScript dropped — JavaScript + React only.** No compile-time replacement (no JSDoc, no PropTypes); Zod remains the only validation, at runtime, same as before.                                                | User-directed stack change. See §2a.                                                                                                                                                                                                                                                                                               |
| 2026-09-13 | **`client/` → `frontend/`, `server/` → `backend/`.** `shared/` unchanged in name and role.                                                                                                                          | User-directed restructure, same request as the JS conversion above.                                                                                                                                                                                                                                                                |
| 2026-09-13 | Converted mechanically with ts-blank-space; zero non-erasable constructs found across all 66 files, verified with a normalized-transpile diff against every pre-migration source                                    | Both packages turned out to be (or already required, on the frontend) fully erasable-syntax TypeScript — nothing needed a hand rewrite beyond the four items below                                                                                                                                                                 |
| 2026-09-13 | Added `authPayloadSchema` (`shared/index.js`) and a runtime validation step in `readAuth()`                                                                                                                         | Restores, as a runtime check, the guarantee a compile-time `as AuthPayload` cast used to provide — a stale token with a different claim shape is now rejected rather than silently producing `req.auth.role === undefined`                                                                                                         |
| 2026-09-13 | Added `VITE_API_URL` / `VITE_SOCKET_URL` to the frontend (`lib/api.js`, `lib/socket.js`), both empty by default                                                                                                     | Found during the migration, not part of the original ask: the backend already supported split-domain hosting (`CLIENT_ORIGIN`, CORS with credentials) but the frontend's hardcoded relative paths only worked because the Vite dev proxy papered over it — a real gap against this file's own Vercel + Render/Railway hosting plan |
| 2026-09-13 | Fixed a corrupted `timeline` subdocument in the `Order` model (`backend/src/models/Order.js`)                                                                                                                       | Pre-existing copy-paste artifact found during migration exploration — a stray `notes` field and duplicated `status` pasted inside the array element; Zod silently stripped it on the wire, so it was never visible to API consumers, but the Mongoose schema itself was wrong                                                      |
| 2026-09-13 | Deleted the root `npm run seed` script                                                                                                                                                                              | It called a `seed` script that never existed in `backend/package.json` — pre-existing and broken; seeding already happens automatically at server boot                                                                                                                                                                             |
| 2026-09-13 | Split Playwright's `webServer` into two entries, one gated on the backend's `/api/health` and one on the frontend's `:5173`                                                                                         | Pre-existing startup race: `access-control.spec.js` hits the backend directly, but only the frontend's readiness was ever awaited, so the first test could reach a cold backend — reproduced repeatedly before this fix, absent after                                                                                              |
| 2026-09-13 | **`shared/index.js` duplicated into `frontend/src/shared/` and `backend/src/shared/`**, both committed; repo-root `shared/` is now the canonical hand-edited source, synced into both via `scripts/sync-shared.mjs` | User is hosting frontend and backend as separate services — each needed to be deployable with zero access to anything outside its own folder. See §2b.                                                                                                                                                                             |
| 2026-09-13 | Added `tests/unit/shared-sync.test.js`, a byte-comparison check between the two committed copies and the canonical source                                                                                           | Direct mitigation for the drift risk this exact duplication was flagged for earlier in the project (when a single `shared/` folder was chosen instead) — now that separate hosting forces duplication, this closes that gap instead of accepting it                                                                                |
| 2026-09-16 | **`backend/.env` now points at the real Atlas cluster**, superseding `mongodb-memory-server` for anyone running with it present; e2e tests pinned to `MONGODB_URI=''` in `playwright.config.js` so they never touch it | User supplied the Atlas connection string and asked for it to be the real store. See §16.                                                                                                                                                                                                                                          |
| 2026-09-16 | Added `customers` and `payments` collections (`backend/src/models/Customer.js`, `Payment.js`) and a `customer` ref on `Order`                                                                                       | User asked for orders (fulfilled or not), customer info, and payment data to be tracked. COD stays the only payment method (§3) — this makes its pending/collected/void state real instead of implicit. See §16.                                                                                                                  |
| 2026-09-16 | Checkout copy changed from "we only keep this for today's delivery" to "no account needed — we save your details for delivery"                                                                                     | The old line became false once customer records persist across orders.                                                                                                                                                                                                                                                             |
| 2026-09-16 | Dish images: chose **free Pexels stock photos over AI generation** (OpenAI would have cost ~$3–5 for the menu)                                                                                                      | User's explicit call after seeing the cost estimate, with the option to fall back to the grey placeholder if quality was bad. See §16.                                                                                                                                                                                              |
| 2026-09-16 | Added `imageSource`/`imageFileId` to `Dish`, GridFS bucket `dishImages`, and `GET /api/images/:id`                                                                                                                  | Storage for the stock photos that works under split Vercel/Render hosting (§2b) — no shared disk between frontend and backend.                                                                                                                                                                                                     |
| 2026-09-16 | Dropped `orientation=square` from the Pexels search query, after finding it measurably worsened match relevance (verified by comparing raw query results with and without it)                                     | A narrower candidate pool ranked worse photos higher — e.g. "indian flatbread" started returning pizza images. `sharp` already crops to a square, so the filter was pure downside.                                                                                                                                                |
| 2026-09-16 | **Driver role added — reverses the 2026-08-14 "no driver role" decision.** Admin assigns a driver to a `READY` order; the driver accepts it and marks it delivered instead of admin. See §17.                     | User request: each driver needs their own login, and the restaurant shouldn't need admin to close out an order a driver delivered.                                                                                                                                                                                                |
| 2026-09-16 | Driver accounts are created **in-app by admin** (`POST /api/drivers`), not seeded from env vars like admin/chef                                                                                                    | User-confirmed: "each driver would be a unique one" — the existing single-seeded-account-per-role pattern can't express multiple accounts, and env vars would mean a redeploy per driver.                                                                                                                                        |
| 2026-09-16 | A driver can only be assigned once an order is `READY`; admin can still mark an unassigned order delivered directly                                                                                                | User-confirmed. Matches the kitchen ticket's pre-existing "waiting for rider" copy; keeps driver assignment optional so an order is never stuck with no way to close it out.                                                                                                                                                     |
| 2026-09-16 | Driver screen (`/driver`) uses light design tokens, not kitchen's dark hardcoded palette                                                                                                                            | User-confirmed. Kitchen's dark theme is justified by being a wall-mounted screen read across a bright room; a driver's phone read outdoors doesn't share that justification.                                                                                                                                                     |
| 2026-09-16 | **Root `shared/` folder and `scripts/sync-shared.mjs` deleted.** `frontend/src/shared/index.js` and `backend/src/shared/index.js` are now hand-synced copies with no canonical third file.                         | User: hosting frontend and backend as fully separate services made the root copy dead weight — neither package ever reads it at build or run time, so keeping it only added a sync step with no real safety benefit over diffing the two live copies directly.                                                                   |
| 2026-09-16 | **Separate login endpoints per staff role** (`/api/auth/{admin,chef,driver}/login`) and pages (`/admin/login`, `/kitchen/login`, `/driver/login`); generic `/api/auth/login` is customers-only | User request. Each endpoint only accepts its own role, and a mismatch returns the same 401 as a bad password. |
| 2026-09-16 | **§10b resolved: order numbers are now 8-char CSPRNG codes, public order responses are stripped, and Socket.IO order events carry no payload** | User: order ids must not be traceable by the public. While doing this, found that every socket broadcast was sending full customer details to every connected browser — a bigger leak than the short numbers. |
| 2026-09-16 | **Admin and chef passwords live only as bcrypt hashes (cost ≥ 12) in env** (`ADMIN_PASSWORD_HASH`, `CHEF_PASSWORD_HASH`); no defaults, synced to the single account on every boot | User chose hashed-in-env over plain passwords in env or adding 2FA. A leaked `.env` or host dashboard no longer reveals a password; rotation is "new hash, restart". |
| 2026-09-16 | **Server-side sessions** (`sessions` collection, 12 h) replace 7-day stateless JWTs | Logout, driver deactivation and password rotation now take effect immediately instead of at token expiry. |
| 2026-09-16 | CSRF guard (custom header + Origin check), login/track/order rate limits, `helmet`, `trust proxy`, `frontend/vercel.json` security headers | Auth review findings. No load balancer added — Render/Railway already provide one; see §18 for what scaling out would need. |
| 2026-09-16 | **Customer registration and customer login removed**, along with `/orders/mine` | Customers never sign in (guest checkout); the routes were unused attack surface. |
| 2026-09-17 | **Performance pass:** gzip responses; in-memory menu (60 s TTL, invalidated on dish changes, sold-out reset once per day); in-memory dish images with ETag/304; 30 s session-lookup cache; route-level code splitting; Google Fonts moved from a CSS `@import` to `<link>` + preconnect | User reported the site felt slow. Measured against Atlas (~80 ms per round trip): menu 400 ms → 3 ms, images ~300 ms → 2 ms after first load, signed-in requests ~80 ms faster, main JS bundle 1,082 KB → 434 KB (charts and map now load only on the pages that use them). |
| 2026-09-17 | Database connection retries with backoff at startup | A transient DNS failure on the Atlas SRV lookup left the dev backend down (`node --watch` does not retry a failed start). |
| 2026-09-17 | **Delivery fee changed from flat ₹39 (free above ₹599) to ₹10/km straight-line, no free threshold; map pin now required to place an order** | User-directed pricing change. See §20. |
| 2026-09-17 | Nav wordmark drops the "Pune" tag and is larger | User request. City tag stays on Contact/Track/Login/footer. |
| 2026-09-17 | Removed invented staff biographical detail (named chef's personal history, a family-recipe anecdote, a named dietitian) from the About page | User: remove text that reads as AI-generated filler. None of it was ever supplied by the user, unlike the real menu and brand facts. See §21. |
| 2026-09-17 | Body text is unselectable by default (`user-select: none`), with inputs and a `.selectable` class (order numbers, addresses, phone numbers) opted back in | User request, for a cleaner feel. See §22. |
| 2026-09-17 | Production-readiness audit saved to `PRODUCTION_READINESS.md`; fixes tracked there one by one | User asked for an audit and a fix list. |
| 2026-09-17 | Server refuses to start on Render/Railway without `NODE_ENV=production`, and in production without `MONGODB_URI` | Neither host sets `NODE_ENV`; without it the cookie isn't Secure/cross-site and rate limits key on the proxy IP. A missing URI silently meant an in-memory DB. |

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

## 14. Tests

`npm run test:all` — 121 tests.

- **Vitest (75)** in `tests/unit/` — the shared contract: state machine (now covering the
  `TRANSITION_ROLE.delivered = ['admin', 'driver']` array form, §17), Zod schemas (including
  the payment ledger and the new driver-account/assignment schemas), cart totals, the
  delivery-distance/ETA maths behind the checkout pin, and the dish-image search-query
  builder's veg/non-veg safety rule (§16). ⚠️ One pre-existing failure, unrelated to the JS
  conversion: `geocode.test.js`'s "measures a known Pune hop within a few hundred metres"
  asserts `distanceKm(BRAND.geo, vimanNagar)` is `> 13` km, but the placeholder `BRAND.geo`
  coordinates measure ~12.9 km — either the test's assumed distance or the placeholder
  coordinates need adjusting; not touched here since it predates this migration and isn't
  part of it.
- **Playwright (46)** in `tests/e2e/` — guest checkout, adding from the landing page, the delivery
  pin, the three-screen loop, cancel → sold out, payment status transitions (pending → collected /
  void), the image route's error handling, access control (now including driver 403s), and
  `driver.spec.js` (§17) — driver accounts are admin-only, assignment only works on a READY
  order and only onto an active driver, one driver cannot touch another's order, deliver
  requires accept first, and a deactivated driver is locked out of both a fresh login and an
  already-issued session — and `hardening.spec.js` (§10, §10b): role-locked login endpoints,
  per-role login redirects, the unguessable order-number format, the stripped public order shape,
  a check that live socket frames never contain an order number or customer details, and the §18
  controls: the CSRF guard, the login rate limit, logout revoking a copied token, per-device
  sessions, and API security headers — all
  asserted **at the API** (or the wire) rather than through the UI. All passing.

Third-party geocoding is deliberately **not** asserted in the e2e tests — it is a network lookup
against someone else's rate-limited service and would make the suite flaky.

⚠️ Since 2026-09-16 the backend `webServer` always cold-starts (`reuseExistingServer: false`,
§16) rather than reusing an already-running dev server — deliberate, so a developer's `npm run dev`
(now pointed at Atlas) can never get silently reused by the suite. The trade-off: a fresh
`mongodb-memory-server` boot is occasionally slow enough to flake the first request or two with
`ECONNRESET`/`ECONNREFUSED` before settling. Observed once; rerunning fixed it immediately. If it
recurs often, look at gating `/api/health` on the Mongoose connection state rather than just the
HTTP server being up.

Test credentials: the Playwright backend gets its own `JWT_SECRET` and staff password hashes from
`tests/e2e/credentials.js` (in-memory database only), and specs import `test` from
`tests/e2e/fixtures.js`, whose `request` fixture sends the CSRF header like the real frontend.

When adding behaviour to the order lifecycle or access rules, extend these rather than
testing by hand — they already cover the paths that matter.

**A real bug the tests caught:** an empty cart was charging a ₹39 delivery fee, because a
subtotal of 0 fell below the (now-removed) free-delivery threshold. Fixed in
`frontend/src/store/cart.js`, back when delivery was a flat fee — see §20.

## 10b. Order-number privacy — RESOLVED (2026-09-16)

`/api/orders/track/:orderNumber` stays unauthenticated, because the tracking design says customers
"type the order number on the site". The order number is therefore treated as a **bearer secret**,
and three things keep it and the customer's details away from anyone who doesn't already hold it:

1. **Unguessable numbers.** `HE-` + 8 characters drawn with `crypto.randomInt` from a 32-symbol
   alphabet with no 0/O/1/I (`HE-7K4QXNPT`, ≈10¹² values), replacing the enumerable 4-digit
   `HE-4821`. `generateOrderNumber()` / `ORDER_NUMBER_PATTERN` in `backend/src/models/Order.js`;
   placement retries on the (vanishingly rare) unique-index collision. `/track` rejects anything
   not matching the pattern with the same 404 before touching the database.
2. **A stripped public shape.** Both the placement response and `/track` return `toPublicOrder()`
   (`backend/src/serialize.js`): no internal Mongo `id`, no `customerId`, no customer phone, no
   payment ledger, no driver id — only what the customer's own tracking page renders. Internal ids
   are only ever returned to authenticated staff.
3. **Payload-free Socket.IO broadcasts.** Every connected browser, anonymous visitors included,
   receives every broadcast. Order events used to carry the full order — name, phone, address and
   order number — so anyone with the site open could harvest every order live. `order:created` /
   `order:updated` now carry **no payload**; each screen refetches through its own guarded REST
   call (`backend/src/realtime.js`, `frontend/src/pages/Track.jsx`).

Pre-existing order numbers in Atlas keep their old 4-digit form. They still resolve in the admin
screens but **no longer resolve on the public tracking page**, because they fail the new pattern.
All covered by `tests/e2e/hardening.spec.js`.

Not done, still worth considering before real traffic: rate limiting on `/track` and on the login
endpoints. With a 10¹² keyspace, enumeration is impractical without it, but it would also blunt
password guessing against the staff logins.

## 15. Geocoding — decide before launch

The checkout pin's address search and reverse lookup use **OpenStreetMap's public Nominatim**
(`frontend/src/lib/geocode.js`). It needs no API key, which is why it suits a prototype.

Its usage policy allows roughly **one request per second** and forbids heavy use. Every call is
debounced and abortable, but that is a courtesy, not a guarantee — under real checkout traffic the
public instance will rate-limit and searches will start failing. Before launch, either self-host
Nominatim or move to a paid geocoder. Only `geocode.js` changes; nothing else calls it.

The map falls back safely: if search fails the customer is told to tap the map instead, and if the
reverse lookup fails the pin still works, it just shows coordinates without a street name.

## 16. Atlas database, payments, customers, and dish images (2026-09-16)

`backend/.env` now points at the real MongoDB Atlas cluster (`MONGODB_URI` + `MONGODB_DB=healthy-eats`),
superseding the `mongodb-memory-server`-in-dev default described in §10a for anyone running with
that file present. `npm run dev`/`start` connect straight to Atlas; only the Playwright `webServer`
forces `MONGODB_URI=''` so e2e tests never place real orders there (`playwright.config.js`).

**New collections**, seeded with indexes on boot (`backend/src/seed.js`) but never pre-populated
with sample data, so admin's revenue figures stay real:

- **`customers`** (`backend/src/models/Customer.js`) — upserted by phone on every order
  (`recordCustomerOrder`), holding name and a deduplicated address history. Guest checkout still
  has no login; this is a profile, not an account. Checkout's "we only keep this for today's
  delivery" copy is gone — see the Decision Log.
- **`payments`** (`backend/src/models/Payment.js`) — one COD ledger row per order:
  `pending` at placement → `collected` (with `collectedAt`/`collectedBy`) when admin marks an order
  delivered, or `void` (`voidedAt`) if it's cancelled first. `PAYMENT_METHODS`/`PAYMENT_STATUSES` /
  `paymentSchema` live in `shared/index.js` next to the order schemas. There is still no payment
  gateway — §3's "Cash on Delivery only" is unchanged; this only makes the COD state visible and
  queryable instead of implicit. Admin's Orders screen shows a `COD · Pending/Collected/Void` label
  per order (`frontend/src/pages/admin/LiveOrders.jsx`).
- `orders` gained a `customer` ref (alongside the existing `customerId → User`, for logged-in staff)
  and a `{status, createdAt}` index. Fulfilled and unfulfilled orders share one collection, split by
  `status` — moving cancelled/delivered orders to a separate collection would break the timeline and
  the public tracking link.

### Dish images — free stock photos, not AI generation

`Dish` gained `imageSource` (`'none' | 'stock' | 'photo'`) and `imageFileId`. Every seeded dish's
`description`/`ingredients` are empty (§8b), so there was nothing to generate real photography
*from* — the two options considered were an AI image model (OpenAI, ~$3–5 for the whole menu, but
illustrating a dish nobody has actually plated) versus free stock photography matched by keyword
(real photos, $0, but of a similar dish rather than this kitchen's own plate). **The user chose free
stock photos** given the cost/authenticity trade-off was marginal either way.

- **`backend/scripts/fetch-dish-images.js`** (`npm run images:fetch -- --yes`) — searches the
  [Pexels API](https://www.pexels.com/api/) (free, no billing account; key in `backend/.env` as
  `PEXELS_API_KEY`) using a query built by **`backend/scripts/lib/dish-image-query.js`**, converts
  the result to an 800px WebP with `sharp`, and stores it in a GridFS bucket named `dishImages` in
  the same Atlas database — no shared disk needed, which matters because frontend/backend deploy as
  separate services (§2b). `GET /api/images/:id` (`backend/src/routes/images.js`) streams it back
  with a `Cache-Control: immutable` header, safe because a regenerated image gets a new file id, not
  a reused one. `dish.image` is set to that route's path; `frontend/src/lib/api.js`'s `assetUrl()`
  resolves it against `VITE_API_URL` the same way every other API call is, and
  `PlatePlaceholder.jsx` renders it with `loading="lazy"`.
- **The query builder never searches a meat/fish/egg word for a veg dish**, even when that word is
  literally in the dish's name (e.g. "Soy Keema" only ever searches "soy"; unit-tested in
  `tests/unit/dish-image-query.test.js`). Indian terms the stock library barely indexes (`bhakri`,
  `roti`, `thali`, `dal`, …) are translated to words it does index (`indian flatbread`,
  `indian platter`, `lentil curry`, …) — found by testing raw Pexels queries directly; a literal
  `bhakri` search under-performs `indian flatbread`.
- **Do not add an `orientation=square` filter to the Pexels request.** It was tried and reverted:
  narrowing to square-oriented source photos shrank the candidate pool enough to measurably worsen
  matches (e.g. "indian flatbread" started returning pizza photos) — `sharp` already crops to a
  square afterward, so the filter bought nothing.
- `imageSource: 'stock'` is never overwritten by a bare `npm run images:fetch -- --yes` run (it only
  fills dishes still at `'none'`); `--force` refetches every non-photo dish; `--only slug1,slug2`
  targets specific dishes. **`imageSource: 'photo'` (real kitchen photography, not yet used by
  anything) is never overwritten under any flag** — the day the admin-upload item in §10a ships,
  swapping a dish to real photography is permanent against this script.
- **Quality is uneven and expected to need spot-fixing.** Pexels doesn't understand dish semantics,
  only keywords — two different "thali" dishes can rank the same top photo, and Indian-specific
  combinations (e.g. soy keema + bhakri) sometimes return a Western interpretation (a wrap) instead
  of the real thing. The script writes a contact sheet to `backend/scratch/dish-images.html`
  (gitignored) after every run — one image per dish, captioned with its search query — specifically
  so bad matches can be spotted and refetched with `--only`.
- **These are illustrative stock photos of a similar dish, not photos of what this kitchen actually
  plates.** Fine for a prototype; flagged here as a decide-before-launch item like §10b/§15 — either
  caption images as illustrative or replace them with real kitchen photography via the still-open
  admin-upload item in §10a before real customers order from them.
- Pexels' free tier rate-limits in short bursts under back-to-back full-menu runs; `search()` retries
  a 429 with exponential backoff, and a failed *download* (an individual photo's CDN URL 4xx'ing)
  falls through to the next candidate for that query rather than failing the whole dish.

## 17. Driver role — login, admin assignment, driver closes out (2026-09-16)

**This reverses §3/§7's earlier "no driver role" decision** (Decision Log, 2026-08-14). The
user asked for delivery drivers with their own logins: admin assigns a driver to a `READY`
order, the driver accepts it, and the driver — not admin — marks it delivered.

**No new order status.** The state machine (§5) is unchanged; assignment is metadata on a
`ready` order, not a transition:

- `driver` set, `acceptedAt` empty → "Assigned, waiting for driver"
- `driver.acceptedAt` set → "Out for delivery"

`shared/index.js`'s `orderDriverSchema` (`{ id, name, assignedAt, acceptedAt? }`),
`assignDriverSchema` (`{ driverId: string | null }`, `null` unassigns), `createDriverSchema`
and `updateDriverSchema` carry this. `TRANSITION_ROLE.delivered` changed from the single value
`'admin'` to the array `['admin', 'driver']` — every `TRANSITION_ROLE` entry is now an array
for consistency, even though only `delivered` needs more than one role today.

**Driver accounts are many, not one.** Unlike admin/chef's single seeded account
(`seedStaffAccount`, keyed by `findOne({ role })`, which structurally supports only one account
per role), drivers are created in-app by admin: `POST /api/drivers`
(`backend/src/routes/drivers.js`), keyed by email like ordinary registration, with `role:
'driver'` hardcoded server-side and never read from the request body — consistent with §10's
rule that role is never client-assignable. `User` gained `phone` and `active` (default
`true`); `PATCH /api/drivers/:id` flips `active` to deactivate/reactivate. A deactivated
driver is refused at login, and deactivation deletes the driver's server-side sessions, so an
already-issued token stops working immediately. (Originally a `requireActiveDriver` middleware
re-checked `active` on each driver route; replaced by revocable sessions in §18.)

**Assignment only when READY**, decided with the user over building it earlier in the
lifecycle: it matches the kitchen ticket's pre-existing "waiting for rider" copy (the plate is
ready before a driver attaches to it), and keeps the flow to assign → accept → deliver without
introducing a new pre-ready holding state. `POST /orders/:id/assign` (admin) 409s on a non-READY
order and 400s on a non-driver or inactive driver id; reassigning clears any prior acceptance.

**Admin fallback stays.** Also decided with the user: an unassigned order can still be closed
out by admin exactly as before (`POST /orders/:id/deliver`, now `requireRole('admin',
'driver')`) — driver assignment is optional per order, not mandatory. Once a driver is
assigned, admin's deliver call 409s ("assigned to X — the driver closes it out") and only that
driver may deliver, and only after they've called `POST /orders/:id/driver-accept` (409 if
not yet accepted, 403 if the order isn't theirs). The COD-collection side effect that already
lived inline in `/deliver` (`Payment` → `collected`, `collectedBy: req.auth.sub`) is unchanged
and now correctly attributes to whichever of admin or driver actually delivered it.

**`GET /orders/driver`** (`requireRole('driver')`) is the driver's queue: `ready` orders where
`driver.user` matches the caller, oldest first, `toOrder()` called **without** payment —
following the `/orders/kitchen` precedent of withholding money data from an operational,
non-admin role (§7). Realtime reuses the existing global `order:updated` Socket.IO broadcast
(`backend/src/realtime.js`) with no new per-driver room, matching the pattern every other
screen already uses: the event is an invalidation signal, and the actual data always comes
back through the role-guarded REST call.

**Frontend:** `/driver` (`frontend/src/pages/Driver.jsx`), guarded by `RequireRole
roles={['driver']}` in `App.jsx`, light tokens per the user's explicit call (a phone read
outdoors has different needs than kitchen's wall-mounted dark screen). Admin gained `/admin
drivers` (`frontend/src/pages/admin/Drivers.jsx`) and a driver-assign dropdown / Unassign
control on `LiveOrders.jsx`'s `ready` rows. `Login.jsx`'s post-login redirect became a
role → path map (`chef → /kitchen`, `driver → /driver`, else `/admin`) instead of a two-way
ternary.

Tests: `tests/e2e/driver.spec.js` (§14) plus a driver-role addition to
`tests/e2e/access-control.spec.js` and new schema tests in `tests/unit/schemas.test.js`.

## 18. Security model (2026-09-16)

**Staff credentials.** Exactly one admin and one chef. Their passwords exist only as bcrypt hashes
(cost ≥ 12) in `backend/.env` / the host's environment: `ADMIN_PASSWORD_HASH`,
`CHEF_PASSWORD_HASH`, plus `JWT_SECRET` (≥ 32 characters). `backend/src/config.js` refuses to
start if any is missing or weak — there are no fallback passwords anywhere. On every boot
`seedStaffAccount` (`backend/src/seed.js`) syncs name, email and hash onto the single account for
that role, and ends its sessions if the hash changed. To rotate: `npm run hash-password` in
`backend/` (hidden input, 12+ characters), paste the quoted hash, restart. The plain passwords
belong in a password manager, never in the repo or the env. Drivers are created by admin and
stored in `users` with cost-12 hashes.

**Sessions.** Signing in creates a row in `sessions` (`backend/src/models/Session.js`, random
32-byte id, 12 h, TTL-indexed) and sets an httpOnly cookie holding a JWT of
`{ sub, role, sid }`. `readAuth` accepts the JWT only while its session row exists, so:
logout ends that one device's session; deactivating a driver or changing a staff password ends all
of that user's sessions immediately. Cost: one indexed lookup per authenticated request.

**CSRF.** In production the cookie is `SameSite=None` because the frontend (Vercel) and API
(Render/Railway) are different sites. `backend/src/middleware/csrf.js` therefore rejects every
non-GET `/api` request that lacks `X-Healthy-Eats: 1` or carries a foreign `Origin`. A cross-site
page cannot add that header without a CORS preflight, and CORS allows only `CLIENT_ORIGIN`.
`frontend/src/lib/api.js` sends it on writes only (GETs stay preflight-free). If the API is ever
served from a subdomain of the site, set `COOKIE_SAME_SITE=lax` for a second layer.

**Rate limits** (`backend/src/middleware/rateLimit.js`, all env-tunable): failed sign-ins 5 per
IP+email and 30 per IP per 15 min; tracking lookups 120 per IP per minute; order placement 20 per IP
per 10 min. Over the limit → 429 with a readable `error`.

**Headers.** `helmet` on the API (with `Cross-Origin-Resource-Policy: cross-origin` so the
frontend can load `/api/images/:id`); `frontend/vercel.json` sets nosniff, frame denial,
referrer policy, HSTS and a permissions policy, plus the SPA rewrite Vercel needs for client-side
routes. **Not done yet:** a Content-Security-Policy — it depends on the production API, map-tile
and geocoder URLs, and a wrong one silently breaks the checkout map.

**Load balancing and scaling.** Not needed now: Render and Railway already terminate TLS and
balance traffic in front of the service. `TRUST_PROXY` (default 1 in production) makes `req.ip`
the real visitor so rate limits work behind that proxy. Sessions live in Mongo, so they already
work across instances. Running **more than one backend instance** would additionally need:
a shared rate-limit store (e.g. Redis via `rate-limit-redis`), the Socket.IO Redis adapter, and
sticky sessions for Socket.IO's polling transport.

## 19. Performance notes (2026-09-17)

Every Atlas round trip costs ~80 ms from the dev machine, so the hot paths avoid them:

- **Menu** — `backend/src/menuCache.js` serves `GET /api/menu` and `/api/menu/:slug` from memory.
  Cleared by the availability toggle and by cancel-with-sold-out; expires after 60 s so changes made
  by another instance or by `npm run images:fetch` still appear. `resetStaleSoldOut()` writes at
  most once per calendar day per process.
- **Dish images** — `backend/src/routes/images.js` keeps image bytes in memory (64 MB budget, LRU)
  after the first request, and answers `If-None-Match` with 304 (the GridFS file id is the ETag).
- **Sessions** — `findSession()` in `backend/src/models/Session.js` remembers lookups for 30 s.
  Logout, driver deactivation and password rotation clear the entry in the same process, so they
  stay immediate on a single instance; with several instances a revoked session could survive on
  another instance for up to 30 s (§18).
- **Compression** — `compression` gzips JSON (the menu goes 49 KB → 5 KB); images are already
  compressed and skipped.
- **Frontend** — every route except Home is `React.lazy`, so recharts (admin history, ~360 KB)
  and leaflet (~150 KB) only load where they're used. Fonts load via `<link>` with preconnect in
  `frontend/index.html`.
- `npm run dev` serves unbundled modules and is noticeably slower than a production build; judge
  real speed with `npm run build` + a static host.

Possible next steps if needed: move `BRAND`/label constants out of the Zod file (zod is in the
main bundle only because every page imports those constants from `@shared/index`), and generate
smaller card-size image variants.

## 20. Distance-based delivery pricing (2026-09-17)

**Delivery changed from a flat ₹39 (free above ₹599) to ₹10 per started km**, straight-line
from the kitchen to the customer's map pin. User-directed change; decided with the user:

- **Distance:** great-circle distance (`distanceKm` in `shared/index.js`, moved here from
  `frontend/src/lib/geocode.js` so both sides use the same formula), rounded **up** to the next
  whole km (`billableKm`) — 2.3 km bills as 3 km. Road distance is typically 20–40% further than
  this; a routing service was considered and rejected for a prototype (rate-limited, another point
  of failure at checkout).
- **The map pin is now required** to place an order (`deliveryAddressSchema` in `shared/index.js`
  requires `lat`/`lng`; the plain `addressSchema` — used by admin/driver reads — is unchanged).
  Checkout's `PinMap` copy was updated to say why. Every order now has an exact delivery distance,
  which also means every order has real coordinates for the driver.
- **No free-delivery threshold.** `FREE_DELIVERY_ABOVE` is gone; every order pays for its
  distance regardless of size.
- **One formula, both sides:** `orderTotals(lines, pin)` in `shared/index.js` computes
  `{ subtotal, deliveryFee, packaging, total }` — `backend/src/routes/orders.js` charges with it,
  `frontend/src/store/cart.js`'s `cartTotals` is now a one-line wrapper around it, and checkout
  displays exactly what the server will charge. `deliveryFee` is `null` (not 0) until there is a
  pin, so the UI can show "Drop a pin" rather than a wrong number.
- Existing delivered/placed orders keep their old flat-fee `deliveryFee` — nothing rewrites
  history.

## 21. Copy pass (2026-09-17)

User feedback: the site's nav wordmark dropped the "Pune" city tag and got larger
(`frontend/src/components/site/Header.jsx`) — the city still appears in the footer and on
Contact/Track/Login. Separately, the user asked to remove text on customer-facing pages that read
as AI-written filler rather than real content. Removed from `frontend/src/pages/About.jsx`:
invented named-staff biographical detail (a chef's personal history, a family recipe anecdote, a
named dietitian and her credentials) that had no source — none of this was ever supplied by the
user, unlike the real menu (§8) and brand facts (§1). Replaced with plain, unnamed statements
about how the kitchen operates. Toned down a few similarly overwritten lines on `Contact.jsx`
("someone standing next to the hob, not a call centre" → a plain sentence). Nothing on `About.jsx`
or `Contact.jsx` was asserted by any test, so no test changes were needed.

## 22. Body text unselectable (2026-09-17)

User request, for a cleaner/more app-like feel: `body { user-select: none }` in
`frontend/src/index.css`. Two carve-outs, both opt back into `user-select: text`:

- `input`, `textarea`, `select`, `[contenteditable]` — otherwise typing and editing would break.
- A new `.selectable` utility class, applied to the handful of things a customer or staff member
  is explicitly told to keep or copy: the order number on the tracking page (customer is told
  "keep this number"), the cancelled-order banner's order number, the customer's delivery address
  on the tracking page, and the customer's name/phone/address on the admin order card and the
  driver's delivery card (staff copy these to call or navigate).

