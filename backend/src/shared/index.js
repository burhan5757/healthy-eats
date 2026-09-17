import { z } from 'zod'

/* ============================================================================
   HEALTHY EATS — shared contract
   One validation contract for client + server. This file exists twice, byte-for-
   byte: backend/src/shared/index.js and frontend/src/shared/index.js, so each
   package deploys on its own. Edit one, copy it over the other (CLAUDE.md §2b).
   ========================================================================= */

/* --- Taxonomy: the two-axis USP (CLAUDE.md §1) ---------------------------- */

/** The three goal packages, named as they appear in the user's landing design. */
export const GOALS = ['fat-loss', 'muscle-gain', 'basic-fitness']
export const TIMINGS = ['pre-workout', 'post-workout', 'meal']
export const DIETS = ['veg', 'non-veg', 'vegan', 'gluten-free']

export const goalSchema = z.enum(GOALS)
export const timingSchema = z.enum(TIMINGS)
export const dietSchema = z.enum(DIETS)

export const GOAL_LABELS = {
  'fat-loss': 'Fat Loss',
  'muscle-gain': 'Muscle Gain',
  'basic-fitness': 'Basic Fitness',
}

export const TIMING_LABELS = {
  'pre-workout': 'Pre-Workout',
  'post-workout': 'Post-Workout',
  meal: 'Meal',
}

export const DIET_LABELS = {
  veg: 'Veg',
  'non-veg': 'Non-Veg',
  vegan: 'Vegan',
  'gluten-free': 'Gluten Free',
}

/** Order-size caps — a real order is nowhere near these; they stop absurd totals. */
export const MAX_QTY_PER_DISH = 20
export const MAX_ORDER_LINES = 30
/** Hard limit on delivery distance. Past BRAND.deliveryRadiusKm checkout warns; past this it refuses. */
export const MAX_DELIVERY_KM = 25

/** A MongoDB ObjectId as a string. Rejecting anything else up front keeps
 *  malformed ids from reaching a query (where they would be a 500). */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Not a valid id')

/* --- Roles ---------------------------------------------------------------- */

export const ROLES = ['customer', 'chef', 'admin', 'driver']
export const roleSchema = z.enum(ROLES)

/** Shape of the JWT payload. Validated on decode — a stale token from an older
 *  code version with a different claim shape must not silently become
 *  `req.auth.role === undefined` and fail open or closed unpredictably. */
export const authPayloadSchema = z.object({
  sub: z.string(),
  role: roleSchema,
  /** Server-side session id — the token is only valid while that row exists. */
  sid: z.string().min(1),
})

/* --- Nutrition ------------------------------------------------------------ */

export const nutritionSchema = z.object({
  kcal: z.number().int().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
})

/* --- Dish ----------------------------------------------------------------- */

export const dishSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string().min(1),
  /** Long copy — used on the specials cards and dish detail. */
  description: z.string(),
  /** Short one-line ingredient list — used on menu grid cards. */
  ingredients: z.string().default(''),
  category: z.string(),
  price: z.number().nonnegative(), // ₹
  image: z.string(),
  /**
   * OPTIONAL on purpose. The real menu poster carries no macro figures, and
   * inventing nutrition data for a fitness kitchen would be actively harmful —
   * people track protein off these numbers. Absent until the kitchen supplies
   * real values; the UI hides macro rows rather than showing zeros.
   */
  nutrition: nutritionSchema.optional(),
  goals: z.array(goalSchema),
  timing: z.array(timingSchema),
  diet: z.array(dietSchema),
  isBestseller: z.boolean(),
  isTodaysSpecial: z.boolean(),
  /** Flipped false when admin cancels an order citing this dish. Resets daily. */
  availableToday: z.boolean(),
  /** 'none' until an image exists. 'stock' is a matched free stock photo, illustrative
   *  only — never the real plate. 'photo' (real kitchen photography) is never overwritten. */
  imageSource: z.enum(['none', 'stock', 'photo']).default('none'),
})

export const dishInputSchema = dishSchema.omit({ id: true })

/* --- Order ---------------------------------------------------------------- */

export const ORDER_STATUSES = [
  'placed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
]
export const orderStatusSchema = z.enum(ORDER_STATUSES)

export const ORDER_STATUS_LABELS = {
  placed: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/**
 * Customer-facing progress track. `cancelled` is deliberately not on it.
 * Left unannotated so the element type stays the 4-step tuple rather than
 * widening back to every OrderStatus.
 */
export const ORDER_PROGRESS = ['placed', 'preparing', 'ready', 'delivered']

export const addressSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Keep the name under 80 characters'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z
    .string()
    .trim()
    .min(5, 'Address is required')
    .max(200, 'Keep the address under 200 characters'),
  landmark: z
    .string()
    .trim()
    .max(120, 'Keep the landmark under 120 characters')
    .optional()
    .default(''),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  /** Dropped pin — what the rider actually navigates to. */
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const orderItemSchema = z.object({
  dishId: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
})

export const timelineEntrySchema = z.object({
  status: orderStatusSchema,
  at: z.string(), // ISO
})

export const cancellationSchema = z.object({
  reason: z.string(),
  /** Dishes the admin marked sold out while cancelling. */
  soldOutDishIds: z.array(z.string()),
})

/* --- Payment (Cash on Delivery ledger — CLAUDE.md §3 "COD only") ---------- */

export const PAYMENT_METHODS = ['cod']
export const PAYMENT_STATUSES = ['pending', 'collected', 'void']
export const paymentMethodSchema = z.enum(PAYMENT_METHODS)
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES)

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  collected: 'Collected',
  void: 'Void',
}

export const paymentSchema = z.object({
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  amount: z.number().nonnegative(),
  collectedAt: z.string().optional(),
  voidedAt: z.string().optional(),
})

/** Set by admin once an order is READY. `acceptedAt` present = out for delivery. */
export const orderDriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  assignedAt: z.string(),
  acceptedAt: z.string().optional(),
})

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  /** Absent for guest orders, which is the normal case (CLAUDE.md §10a). */
  customerId: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  packaging: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  address: addressSchema,
  /** Free-text kitchen note — allergies, "extra chutney". Shown on the chef ticket. */
  notes: z.string().default(''),
  status: orderStatusSchema,
  timeline: z.array(timelineEntrySchema),
  cancellation: cancellationSchema.optional(),
  /** COD ledger entry. Absent only for legacy orders placed before payments existed. */
  payment: paymentSchema.optional(),
  driver: orderDriverSchema.optional(),
  createdAt: z.string(),
})

/* --- User ----------------------------------------------------------------- */

export const publicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  phone: z.string().optional(),
  active: z.boolean().optional(),
})

/* ============================================================================
   Request payloads
   ========================================================================= */

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const PIN_REQUIRED = 'Drop a pin on the map — delivery is priced by distance'

/** A new order's address: the map pin is mandatory, because it prices delivery. */
export const deliveryAddressSchema = addressSchema
  .extend({
    lat: z
      .number({ error: PIN_REQUIRED })
      .min(-90, PIN_REQUIRED)
      .max(90, PIN_REQUIRED),
    lng: z
      .number({ error: PIN_REQUIRED })
      .min(-180, PIN_REQUIRED)
      .max(180, PIN_REQUIRED),
  })
  // Between deliveryRadiusKm and this, checkout only warns; beyond it the
  // kitchen can't deliver at all (CLAUDE.md §20).
  .refine((a) => distanceKm(BRAND.geo, a) <= MAX_DELIVERY_KM, {
    message: `We can't deliver more than ${MAX_DELIVERY_KM} km from the kitchen — move the pin closer`,
    path: ['lat'],
  })

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        dishId: objectIdSchema,
        qty: z
          .number()
          .int()
          .positive()
          .max(MAX_QTY_PER_DISH, `At most ${MAX_QTY_PER_DISH} of one dish`),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(MAX_ORDER_LINES, `At most ${MAX_ORDER_LINES} different dishes`)
    .refine(
      (items) => new Set(items.map((i) => i.dishId)).size === items.length,
      'Each dish may appear only once',
    ),
  address: deliveryAddressSchema,
  notes: z
    .string()
    .max(200, 'Keep the note under 200 characters')
    .optional()
    .default(''),
  /** Proof the phone was verified by SMS code (POST /otp/verify). */
  phoneToken: z.string().max(2000).optional(),
})

/* --- Phone verification (SMS OTP) ----------------------------------------- */

export const OTP_LENGTH = 6

export const otpSendSchema = z.object({
  phone: addressSchema.shape.phone,
})

export const otpVerifySchema = z.object({
  phone: addressSchema.shape.phone,
  code: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_LENGTH}}$`),
      `Enter the ${OTP_LENGTH}-digit code`,
    ),
})

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Give the customer a reason')
    .max(200, 'Keep the reason under 200 characters'),
  /** Empty array = reject the order without marking anything sold out. */
  soldOutDishIds: z.array(objectIdSchema).max(MAX_ORDER_LINES).default([]),
})

/** `null` unassigns — the order falls back to admin closing it out. */
export const assignDriverSchema = z.object({
  driverId: objectIdSchema.nullable(),
})

/** Drivers are created by admin only; role is never read from the body (CLAUDE.md §10). */
export const createDriverSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Keep the name under 80 characters'),
  phone: addressSchema.shape.phone,
  email: z.email('Enter a valid email'),
  // bcrypt ignores everything past 72 bytes, so longer would be misleading.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
})

export const updateDriverSchema = z.object({
  active: z.boolean(),
})

/* ============================================================================
   Order state machine — enforced on the server (CLAUDE.md §5)
   ========================================================================= */

export const ALLOWED_TRANSITIONS = {
  placed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'], // cancel allowed here, NEVER after ready
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
}

/** Which roles are permitted to perform each transition. */
export const TRANSITION_ROLE = {
  preparing: ['admin'], // admin accepts → auto-enters preparing
  ready: ['chef'], // the chef's single button
  // the assigned driver closes it out; admin only when no driver is assigned
  delivered: ['admin', 'driver'],
  cancelled: ['admin'],
}

export function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/* ============================================================================
   Socket.IO events
   ========================================================================= */

export const SOCKET_EVENTS = {
  orderCreated: 'order:created',
  orderUpdated: 'order:updated',
  menuUpdated: 'menu:updated',
}

/* ============================================================================
   Business constants
   ========================================================================= */

/** ₹ per started km, straight line from the kitchen to the customer's pin. */
export const DELIVERY_FEE_PER_KM = 10
export const PACKAGING_FEE = 15 // ₹ — matches the checkout design
export const PREP_TIME_MINUTES = 30

/** The kitchen's clock. Servers run on UTC; "today" always means today in Pune. */
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata'

/** "HH:MM" for `date` on the kitchen's clock. */
function clockTime(date) {
  return date.toLocaleTimeString('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/** True while the kitchen takes orders (BRAND.orderingHours, IST). */
export function isOpenAt(date = new Date()) {
  const now = clockTime(date)
  const { open, lastOrder } = BRAND.orderingHours
  return now >= open && now < lastOrder
}

/** YYYY-MM-DD for `date` as a calendar day in the kitchen's time zone. */
export function dayKey(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: BUSINESS_TIME_ZONE })
}

const EARTH_RADIUS_KM = 6371
const toRad = (deg) => (deg * Math.PI) / 180

/** Straight-line (great-circle) distance in km between two { lat, lng }. */
export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** Billable km: every started km counts, and there is always at least one. */
export function billableKm(pin) {
  return Math.max(1, Math.ceil(distanceKm(BRAND.geo, pin)))
}

/**
 * Delivery fee for a pinned address — ₹10 for every started km. The server
 * charges exactly this; checkout shows the same number (CLAUDE.md §20).
 */
export function deliveryFeeFor(pin) {
  return billableKm(pin) * DELIVERY_FEE_PER_KM
}

/**
 * Order totals from `{ price, qty }` lines and the delivery pin. The server
 * computes the charged amount with this; checkout shows the same function's
 * result. `deliveryFee` is null until there is a pin to price it from.
 */
export function orderTotals(lines, pin) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  const empty = lines.length === 0
  const hasPin = pin?.lat != null && pin?.lng != null
  const deliveryFee = empty ? 0 : hasPin ? deliveryFeeFor(pin) : null
  const packaging = empty ? 0 : PACKAGING_FEE
  return {
    subtotal,
    deliveryFee,
    packaging,
    total: subtotal + (deliveryFee ?? 0) + packaging,
  }
}

/** True when the dish should carry the red non-veg mark. */
export function isNonVeg(diet) {
  return diet.includes('non-veg')
}

/* ============================================================================
   Brand — taken verbatim from the user's landing design
   ========================================================================= */

/**
 * Placeholder brand facts for the public/demo build — the real kitchen's address, phone,
 * coordinates and FSSAI number are deliberately not committed here. Replace every field
 * with the real details in a private `.env`-backed config (or a local, gitignored override)
 * before deploying for the actual business.
 */
export const BRAND = {
  name: 'Healthy Eats',
  city: 'Pune',
  legalName: 'Healthy Eats Kitchen LLP, Pune',
  tagline: 'Balanced meals, portioned properly, cooked fresh every day.',
  kitchenLabel: 'Healthy Eats Kitchen, Kothrud',
  blurb:
    'A neighbourhood kitchen cooking goal-based meals for people who train, and for anyone who wants dinner portioned properly.',
  address: { line1: 'Shop 0, Example Complex', line2: 'Kothrud, Pune 411038' },
  /** Where the riders leave from — the checkout map opens here and measures from it.
   *  Placeholder: approximate Kothrud-area coordinates, not the real kitchen's location. */
  geo: { lat: 18.5089, lng: 73.8088 },
  /** Beyond this the food arrives cold; checkout warns rather than blocks. */
  deliveryRadiusKm: 12,
  phone: '+91 90000 00000',
  hours: 'Mon – Sun, 11:00 – 22:30',
  kitchenHours: 'Kitchen 11:00 – 22:30',
  /** When orders are accepted (IST). Last order leaves time to cook before close. */
  orderingHours: { open: '11:00', lastOrder: '22:00' },
  deliveryAreas: ['Kothrud', 'Baner', 'Viman Nagar', 'Hinjewadi'],
  since: '2026',
  instagram: '@healthyeats.demo',
  fssai: '00000000000000',
  heroPills: [
    'Cooked fresh daily',
    'Macros on every plate',
    'Delivering across Pune',
  ],
}
