import { z } from 'zod'

/* ============================================================================
   HEALTHY EATS — shared contract
   Single source of truth for types AND validation, imported by client + server.
   See CLAUDE.md §6 principle 1.
   ========================================================================= */

/* --- Taxonomy: the two-axis USP (CLAUDE.md §1) ---------------------------- */

/** The three goal packages, named as they appear in the user's landing design. */
export const GOALS = ['fat-loss', 'muscle-gain', 'basic-fitness'];        
export const TIMINGS = ['pre-workout', 'post-workout', 'meal'];        
export const DIETS = ['veg', 'non-veg', 'vegan', 'gluten-free'];        

export const goalSchema = z.enum(GOALS)
export const timingSchema = z.enum(TIMINGS)
export const dietSchema = z.enum(DIETS)

;                                            
;                                                
;                                            

export const GOAL_LABELS                       = {
  'fat-loss': 'Fat Loss',
  'muscle-gain': 'Muscle Gain',
  'basic-fitness': 'Basic Fitness',
}

export const TIMING_LABELS                         = {
  'pre-workout': 'Pre-Workout',
  'post-workout': 'Post-Workout',
  meal: 'Meal',
}

export const DIET_LABELS                       = {
  veg: 'Veg',
  'non-veg': 'Non-Veg',
  vegan: 'Vegan',
  'gluten-free': 'Gluten Free',
}

/* --- Roles ---------------------------------------------------------------- */

export const ROLES = ['customer', 'chef', 'admin'];        
export const roleSchema = z.enum(ROLES)
;                                            

/** Shape of the JWT payload. Validated on decode — a stale token from an older
 *  code version with a different claim shape must not silently become
 *  `req.auth.role === undefined` and fail open or closed unpredictably. */
export const authPayloadSchema = z.object({
  sub: z.string(),
  role: roleSchema,
})
;                                                          

/* --- Nutrition ------------------------------------------------------------ */

export const nutritionSchema = z.object({
  kcal: z.number().int().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
})
;                                                      

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
})
;                                            

export const dishInputSchema = dishSchema.omit({ id: true })
;                                                      

/* --- Order ---------------------------------------------------------------- */

export const ORDER_STATUSES = ['placed', 'preparing', 'ready', 'delivered', 'cancelled'];        
export const orderStatusSchema = z.enum(ORDER_STATUSES)
;                                                          

export const ORDER_STATUS_LABELS                              = {
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
export const ORDER_PROGRESS = ['placed', 'preparing', 'ready', 'delivered'];        

export const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().min(5, 'Address is required'),
  landmark: z.string().optional().default(''),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  /** Dropped pin — what the rider actually navigates to. */
  lat: z.number().optional(),
  lng: z.number().optional(),
})
;                                                  

export const orderItemSchema = z.object({
  dishId: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
})
;                                                      

export const timelineEntrySchema = z.object({
  status: orderStatusSchema,
  at: z.string(), // ISO
})
;                                                              

export const cancellationSchema = z.object({
  reason: z.string(),
  /** Dishes the admin marked sold out while cancelling. */
  soldOutDishIds: z.array(z.string()),
})
;                                                            

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
  createdAt: z.string(),
})
;                                              

/* --- User ----------------------------------------------------------------- */

export const publicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
})
;                                                        

/* ============================================================================
   Request payloads
   ========================================================================= */

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
;                                                         

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
;                                                   

export const placeOrderSchema = z.object({
  items: z
    .array(z.object({ dishId: z.string(), qty: z.number().int().positive() }))
    .min(1, 'Your cart is empty'),
  address: addressSchema,
  notes: z.string().max(200, 'Keep the note under 200 characters').optional().default(''),
})
;                                                             

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Give the customer a reason'),
  /** Empty array = reject the order without marking anything sold out. */
  soldOutDishIds: z.array(z.string()).default([]),
})
;                                                               

/* ============================================================================
   Order state machine — enforced on the server (CLAUDE.md §5)
   ========================================================================= */

export const ALLOWED_TRANSITIONS                                              = {
  placed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'], // cancel allowed here, NEVER after ready
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
}

/** Which role is permitted to perform each transition. */
export const TRANSITION_ROLE                                               = {
  preparing: 'admin', // admin accepts → auto-enters preparing
  ready: 'chef', // the chef's single button
  delivered: 'admin', // admin closes the order out
  cancelled: 'admin',
}

export function canTransition(from             , to             )          {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/* ============================================================================
   Socket.IO events
   ========================================================================= */

export const SOCKET_EVENTS = {
  orderCreated: 'order:created',
  orderUpdated: 'order:updated',
  menuUpdated: 'menu:updated',
};        

/* ============================================================================
   Business constants
   ========================================================================= */

export const DELIVERY_FEE = 39 // ₹ — matches the checkout design
export const PACKAGING_FEE = 15 // ₹ — matches the checkout design
export const FREE_DELIVERY_ABOVE = 599 // ₹
export const PREP_TIME_MINUTES = 30

/** True when the dish should carry the red non-veg mark. */
export function isNonVeg(diet                 )          {
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
  deliveryAreas: ['Kothrud', 'Baner', 'Viman Nagar', 'Hinjewadi'],
  since: '2026',
  instagram: '@healthyeats.demo',
  fssai: '00000000000000',
  heroPills: ['Cooked fresh daily', 'Macros on every plate', 'Delivering across Pune'],
};        

