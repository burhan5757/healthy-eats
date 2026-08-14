import { config } from './config.js'
import { User, hashPassword } from './models/User.js'
import { Dish } from './models/Dish.js'

/* ============================================================================
   MENU — transcribed from the user's own design screenshots (landing + menu).

   These are NOT invented dishes. Every name, price, macro figure, ingredient
   line, goal badge and veg/non-veg mark was read off the design.

   Three dishes sit in the bottom row of the menu screenshot, where the price
   and macro figures are cut off by the viewport. Those values are marked
   `ESTIMATED` below and are the only numbers here that did not come from the
   design — they need one line of correction each from the user.

   The design's header reads "12 DISHES TODAY", and there are 12 dishes here.
   The landing page's "77 meals" refers to the full catalogue still to come.
   ========================================================================= */
const DESIGN_DISHES = [
  /* --- Fat Loss ----------------------------------------------------------- */
  {
    slug: 'lean-chicken-thali',
    sortOrder: 1,
    name: 'Lean Chicken Thali',
    description: 'Chicken sukka with two bhakri and a fresh salad, portioned for a cut.',
    ingredients: 'Chicken sukka, two bhakri, salad',
    category: 'Thali',
    price: 229,
    image: '',
    nutrition: { kcal: 520, protein: 46, carbs: 52, fat: 12 },
    goals: ['fat-loss'],
    timing: ['meal'],
    diet: ['non-veg'],
    isBestseller: true,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'paneer-brown-rice',
    sortOrder: 2,
    name: 'Paneer & Brown Rice',
    description: 'Low-fat paneer with brown rice and a sharp kachumber.',
    ingredients: 'Low-fat paneer, brown rice, kachumber',
    category: 'Thali',
    price: 179,
    image: '',
    nutrition: { kcal: 480, protein: 28, carbs: 58, fat: 14 },
    goals: ['fat-loss'],
    timing: ['meal'],
    diet: ['veg'],
    isBestseller: false,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'grilled-fish-broccoli',
    sortOrder: 3,
    name: 'Grilled Fish & Broccoli',
    description: 'Surmai fillet, charred broccoli and lemon. Nothing else.',
    ingredients: 'Surmai, charred broccoli, lemon',
    category: 'Salads & Steam',
    price: 279,
    image: '',
    nutrition: { kcal: 420, protein: 44, carbs: 18, fat: 16 },
    goals: ['fat-loss'],
    timing: ['meal'],
    diet: ['non-veg', 'gluten-free'],
    isBestseller: false,
    isTodaysSpecial: false,
    availableToday: true,
  },

  /* --- Muscle Gain -------------------------------------------------------- */
  {
    slug: 'paneer-gainer-thali',
    sortOrder: 4,
    name: 'Paneer Gainer Thali',
    description: 'Paneer sabji with three chapati, dal and rice — built for a surplus.',
    ingredients: 'Paneer sabji, three chapati, dal, rice',
    category: 'Thali',
    price: 229,
    image: '',
    nutrition: { kcal: 780, protein: 46, carbs: 82, fat: 26 },
    goals: ['muscle-gain'],
    timing: ['meal'],
    diet: ['veg'],
    isBestseller: true,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'classic-whey-oats-shake',
    sortOrder: 5,
    name: 'Classic Whey & Oats Shake',
    description: 'Single scoop whey blended with rolled oats and milk.',
    ingredients: 'Single scoop whey, rolled oats, milk',
    category: 'Shakes',
    price: 179,
    image: '',
    nutrition: { kcal: 420, protein: 32, carbs: 48, fat: 9 },
    goals: ['muscle-gain'],
    timing: ['post-workout'],
    diet: ['veg'],
    isBestseller: true,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'chicken-sukka-rice-thali',
    sortOrder: 6,
    name: 'Chicken Sukka & Rice Thali',
    description: 'Kolhapuri chicken sukka, jeera rice, two bhakri and a bowl of solkadhi.',
    ingredients: 'Kolhapuri sukka, jeera rice, bhakri',
    category: 'Indian & Tandoor',
    price: 299,
    image: '',
    nutrition: { kcal: 820, protein: 52, carbs: 86, fat: 24 },
    goals: ['muscle-gain'],
    timing: ['meal'],
    diet: ['non-veg'],
    isBestseller: false,
    isTodaysSpecial: true,
    availableToday: true,
  },

  /* --- Basic Fitness ------------------------------------------------------ */
  {
    slug: 'homestyle-diet-thali',
    sortOrder: 7,
    name: 'Homestyle Diet Thali',
    description: 'Sabji, dal, two chapati and salad — dinner, portioned properly.',
    ingredients: 'Sabji, dal, two chapati, salad',
    category: 'Thali',
    price: 179,
    image: '',
    nutrition: { kcal: 560, protein: 22, carbs: 74, fat: 16 },
    goals: ['basic-fitness'],
    timing: ['meal'],
    diet: ['veg'],
    isBestseller: true,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'power-omelette',
    sortOrder: 8,
    name: 'Power Omelette',
    description: 'Three eggs with onion and coriander, cooked with no oil.',
    ingredients: 'Three eggs, onion, coriander, no oil',
    category: 'Shakes',
    price: 99,
    image: '',
    nutrition: { kcal: 280, protein: 22, carbs: 6, fat: 18 },
    goals: ['basic-fitness'],
    timing: ['pre-workout', 'post-workout'],
    diet: ['non-veg', 'gluten-free'],
    isBestseller: false,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'moong-dal-khichdi-special',
    sortOrder: 9,
    name: 'Moong Dal Khichdi Special',
    description: 'Moong dal khichdi, ghee tadka, curd and papad.',
    ingredients: 'Ghee tadka, curd, papad',
    category: 'Thali',
    price: 129,
    image: '',
    nutrition: { kcal: 430, protein: 18, carbs: 62, fat: 9 },
    goals: ['basic-fitness'],
    timing: ['meal'],
    diet: ['veg'],
    isBestseller: false,
    isTodaysSpecial: true,
    availableToday: true,
  },

  /* --- Indian & Tandoor / Salads ------------------------------------------ */
  {
    slug: 'malai-paneer-tikka',
    sortOrder: 10,
    name: 'Malai Paneer Tikka',
    description: 'Tandoor-charred paneer in a dahi-cream marinade.',
    ingredients: 'Tandoor-charred, dahi-cream marinade',
    category: 'Indian & Tandoor',
    price: 249, // ESTIMATED — cut off in the menu screenshot
    image: '',
    // ESTIMATED — macros cut off in the menu screenshot
    nutrition: { kcal: 520, protein: 30, carbs: 22, fat: 34 },
    goals: ['muscle-gain'],
    timing: ['meal'],
    diet: ['veg', 'gluten-free'],
    isBestseller: false,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'butter-chicken',
    sortOrder: 11,
    name: 'Butter Chicken',
    description: 'Tomato-cashew gravy with two chapati.',
    ingredients: 'Tomato-cashew gravy, two chapati',
    category: 'Indian & Tandoor',
    price: 289, // ESTIMATED — cut off in the menu screenshot
    image: '',
    // ESTIMATED — macros cut off in the menu screenshot
    nutrition: { kcal: 690, protein: 38, carbs: 54, fat: 32 },
    goals: ['muscle-gain'],
    timing: ['meal'],
    diet: ['non-veg'],
    isBestseller: false,
    isTodaysSpecial: false,
    availableToday: true,
  },
  {
    slug: 'grilled-chicken-salad',
    sortOrder: 12,
    name: 'Grilled Chicken Salad',
    description: 'Greens, olives, grilled breast and a squeeze of lime.',
    ingredients: 'Greens, olives, grilled breast, lime',
    category: 'Salads & Steam',
    price: 219, // ESTIMATED — cut off in the menu screenshot
    image: '',
    // ESTIMATED — macros cut off in the menu screenshot
    nutrition: { kcal: 390, protein: 40, carbs: 14, fat: 18 },
    goals: ['fat-loss'],
    timing: ['post-workout', 'meal'],
    diet: ['non-veg', 'gluten-free'],
    isBestseller: false,
    isTodaysSpecial: false,
    availableToday: true,
  },
] as const

/**
 * Idempotent seed, run on every boot.
 *
 * The admin and chef accounts exist ONLY here — no route can create them.
 * This is what makes "only one admin" enforceable (CLAUDE.md §10).
 */
export async function seed(): Promise<void> {
  await seedStaffAccount('admin', config.admin)
  await seedStaffAccount('chef', config.chef)

  const dishCount = await Dish.countDocuments()
  if (dishCount === 0) {
    await Dish.insertMany(DESIGN_DISHES)
    console.log(`[seed] inserted ${DESIGN_DISHES.length} dishes from the design`)
  }
}

async function seedStaffAccount(
  role: 'admin' | 'chef',
  account: { name: string; email: string; password: string },
): Promise<void> {
  const existing = await User.findOne({ role })
  if (existing) return

  await User.create({
    name: account.name,
    email: account.email.toLowerCase(),
    passwordHash: await hashPassword(account.password),
    role,
  })
  console.log(`[seed] created ${role} account: ${account.email}`)
}
