import { config } from './config.js'
import { User, hashPassword } from './models/User.js'
import { Dish } from './models/Dish.js'

/* ============================================================================
   MENU - transcribed from the kitchen's printed menu poster
   (design/Screenshot 2026-08-14 030539.png).

   104 dishes plus 15 add-ons. Names, prices, goal packages,
   pre/post-workout grouping and veg/non-veg all come straight off the poster.

   MACROS ARE ESTIMATES. The poster carries no calorie or macro figures. The
   seven dishes that appear in the website design use the exact numbers shown
   there; the rest are considered estimates from portion composition, so the
   site reads as a finished product.

   They have NOT been checked by a dietitian. Before real customers rely on
   them, have the kitchen confirm each line - people dose protein off these.
   See CLAUDE.md 8b.

   Veg / non-veg is inferred from dish names (chicken, fish, mutton, egg,
   keema, sukka -> non-veg). Worth a human check before launch.

   Bestsellers and today's specials are the seven dishes that appeared in the
   website design; all seven exist on this poster.
   ========================================================================= */

type SeedDish = {
  sortOrder: number
  slug: string
  name: string
  price: number
  category: string
  nutrition: { kcal: number; protein: number; carbs: number; fat: number }
  goals: readonly string[]
  timing: readonly string[]
  diet: readonly string[]
  isBestseller: boolean
  isTodaysSpecial: boolean
}

const MENU: SeedDish[] = [
  /* --- Fat Loss - pre-workout --- */
  { sortOrder: 1, slug: 'sweet-potato-bowl', name: 'Sweet Potato Bowl', price: 99, category: 'Pre-Workout', nutrition: { kcal: 180, protein: 3, carbs: 40, fat: 1 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 2, slug: 'apple-peanut-butter', name: 'Apple & Peanut Butter', price: 99, category: 'Pre-Workout', nutrition: { kcal: 230, protein: 7, carbs: 28, fat: 11 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 3, slug: 'black-coffee-almonds', name: 'Black Coffee & Almonds', price: 89, category: 'Pre-Workout', nutrition: { kcal: 120, protein: 5, carbs: 5, fat: 10 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 4, slug: 'boiled-potato-salad', name: 'Boiled Potato Salad', price: 79, category: 'Pre-Workout', nutrition: { kcal: 160, protein: 4, carbs: 33, fat: 2 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 5, slug: 'green-tea-walnuts', name: 'Green Tea & Walnuts', price: 69, category: 'Pre-Workout', nutrition: { kcal: 140, protein: 4, carbs: 4, fat: 13 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 6, slug: 'papaya-bowl', name: 'Papaya Bowl', price: 89, category: 'Pre-Workout', nutrition: { kcal: 90, protein: 1, carbs: 22, fat: 0 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 7, slug: 'oats-water-soup-bowl', name: 'Oats Water Soup Bowl', price: 89, category: 'Pre-Workout', nutrition: { kcal: 150, protein: 5, carbs: 27, fat: 3 }, goals: ['fat-loss'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Fat Loss - post-workout --- */
  { sortOrder: 8, slug: 'classic-egg-whites', name: 'Classic Egg Whites', price: 99, category: 'Post-Workout', nutrition: { kcal: 110, protein: 22, carbs: 2, fat: 0 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 9, slug: 'whey-in-water', name: 'Whey in Water', price: 169, category: 'Post-Workout', nutrition: { kcal: 130, protein: 27, carbs: 4, fat: 1 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 10, slug: 'grilled-tofu-bites', name: 'Grilled Tofu Bites', price: 129, category: 'Post-Workout', nutrition: { kcal: 190, protein: 18, carbs: 6, fat: 11 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 11, slug: 'boiled-chicken-salad', name: 'Boiled Chicken Salad', price: 149, category: 'Post-Workout', nutrition: { kcal: 220, protein: 32, carbs: 8, fat: 6 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 12, slug: 'soya-bean-salad', name: 'Soya Bean Salad', price: 99, category: 'Post-Workout', nutrition: { kcal: 200, protein: 18, carbs: 14, fat: 8 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 13, slug: 'low-fat-paneer-tikka', name: 'Low-Fat Paneer Tikka', price: 129, category: 'Post-Workout', nutrition: { kcal: 230, protein: 24, carbs: 8, fat: 11 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 14, slug: 'sprouts-protein-bowl', name: 'Sprouts Protein Bowl', price: 99, category: 'Post-Workout', nutrition: { kcal: 180, protein: 14, carbs: 26, fat: 3 }, goals: ['fat-loss'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Fat Loss - veg meals --- */
  { sortOrder: 15, slug: 'paneer-brown-rice', name: 'Paneer & Brown Rice', price: 179, category: 'Lunch & Dinner', nutrition: { kcal: 480, protein: 28, carbs: 58, fat: 14 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 16, slug: 'tofu-grill-salad-bowl', name: 'Tofu Grill Salad Bowl', price: 169, category: 'Lunch & Dinner', nutrition: { kcal: 330, protein: 24, carbs: 22, fat: 16 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 17, slug: 'soy-keema-bhakri', name: 'Soy Keema & Bhakri', price: 149, category: 'Lunch & Dinner', nutrition: { kcal: 420, protein: 28, carbs: 48, fat: 12 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 18, slug: 'dal-paneer-soup-combo', name: 'Dal & Paneer Soup Combo', price: 189, category: 'Lunch & Dinner', nutrition: { kcal: 360, protein: 24, carbs: 30, fat: 14 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 19, slug: 'chana-paneer-salad', name: 'Chana-Paneer Salad', price: 159, category: 'Lunch & Dinner', nutrition: { kcal: 380, protein: 22, carbs: 36, fat: 15 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 20, slug: 'palak-paneer-bajra-bhakri', name: 'Palak Paneer & Bajra Bhakri', price: 169, category: 'Lunch & Dinner', nutrition: { kcal: 460, protein: 26, carbs: 44, fat: 18 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: true },
  { sortOrder: 21, slug: 'vegan-detox-thali', name: 'Vegan Detox Thali', price: 159, category: 'Lunch & Dinner', nutrition: { kcal: 390, protein: 16, carbs: 58, fat: 10 }, goals: ['fat-loss'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Fat Loss - non-veg meals --- */
  { sortOrder: 22, slug: 'lean-chicken-thali', name: 'Lean Chicken Thali', price: 229, category: 'Lunch & Dinner', nutrition: { kcal: 520, protein: 46, carbs: 52, fat: 12 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: true, isTodaysSpecial: false },
  { sortOrder: 23, slug: 'shredding-chicken-bowl', name: 'Shredding Chicken Bowl', price: 209, category: 'Lunch & Dinner', nutrition: { kcal: 420, protein: 42, carbs: 34, fat: 11 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 24, slug: 'grilled-fish-broccoli', name: 'Grilled Fish & Broccoli', price: 279, category: 'Lunch & Dinner', nutrition: { kcal: 420, protein: 44, carbs: 18, fat: 16 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 25, slug: 'egg-white-omelette-roll', name: 'Egg White Omelette Roll', price: 159, category: 'Lunch & Dinner', nutrition: { kcal: 300, protein: 24, carbs: 32, fat: 8 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 26, slug: 'chicken-clear-soup-salad', name: 'Chicken Clear Soup & Salad', price: 169, category: 'Lunch & Dinner', nutrition: { kcal: 240, protein: 28, carbs: 14, fat: 7 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 27, slug: 'steam-fish-rice', name: 'Steam Fish & Rice', price: 259, category: 'Lunch & Dinner', nutrition: { kcal: 480, protein: 40, carbs: 52, fat: 10 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 28, slug: 'low-calorie-chicken-sukka', name: 'Low-Calorie Chicken Sukka', price: 209, category: 'Lunch & Dinner', nutrition: { kcal: 380, protein: 40, carbs: 16, fat: 16 }, goals: ['fat-loss'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Muscle Gain - pre-workout --- */
  { sortOrder: 29, slug: 'banana-peanut-butter-toast', name: 'Banana Peanut Butter Toast', price: 129, category: 'Pre-Workout', nutrition: { kcal: 380, protein: 12, carbs: 48, fat: 16 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 30, slug: 'oats-banana-porridge', name: 'Oats Banana Porridge', price: 129, category: 'Pre-Workout', nutrition: { kcal: 350, protein: 12, carbs: 58, fat: 8 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 31, slug: 'sweet-potato-almonds', name: 'Sweet Potato & Almonds', price: 149, category: 'Pre-Workout', nutrition: { kcal: 340, protein: 9, carbs: 46, fat: 14 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 32, slug: 'honey-muesli-bowl', name: 'Honey Muesli Bowl', price: 129, category: 'Pre-Workout', nutrition: { kcal: 360, protein: 11, carbs: 60, fat: 9 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 33, slug: 'rice-cakes-with-peanut-butter', name: 'Rice Cakes with Peanut Butter', price: 139, category: 'Pre-Workout', nutrition: { kcal: 320, protein: 10, carbs: 40, fat: 14 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 34, slug: 'sattu-protein-drink', name: 'Sattu Protein Drink', price: 129, category: 'Pre-Workout', nutrition: { kcal: 280, protein: 14, carbs: 40, fat: 6 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 35, slug: 'fruit-nut-loaded-bowl', name: 'Fruit & Nut Loaded Bowl', price: 159, category: 'Pre-Workout', nutrition: { kcal: 400, protein: 10, carbs: 52, fat: 18 }, goals: ['muscle-gain'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Muscle Gain - post-workout --- */
  { sortOrder: 36, slug: 'the-bulking-king-shake', name: 'The Bulking King Shake', price: 149, category: 'Post-Workout', nutrition: { kcal: 620, protein: 38, carbs: 72, fat: 18 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 37, slug: 'classic-whey-oats-shake', name: 'Classic Whey & Oats Shake', price: 179, category: 'Post-Workout', nutrition: { kcal: 420, protein: 32, carbs: 48, fat: 9 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['veg'], isBestseller: true, isTodaysSpecial: false },
  { sortOrder: 38, slug: 'egg-toast-power', name: 'Egg & Toast Power', price: 149, category: 'Post-Workout', nutrition: { kcal: 420, protein: 26, carbs: 38, fat: 18 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 39, slug: 'paneer-banana-smoothie', name: 'Paneer-Banana Smoothie', price: 159, category: 'Post-Workout', nutrition: { kcal: 400, protein: 24, carbs: 44, fat: 14 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 40, slug: 'chicken-potato-mash', name: 'Chicken & Potato Mash', price: 149, category: 'Post-Workout', nutrition: { kcal: 450, protein: 38, carbs: 44, fat: 12 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 41, slug: 'mango-strawberry-whey-shake', name: 'Mango/Strawberry Whey Shake', price: 189, category: 'Post-Workout', nutrition: { kcal: 380, protein: 30, carbs: 46, fat: 7 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 42, slug: 'soy-sprouts-chaat', name: 'Soy & Sprouts Chaat', price: 129, category: 'Post-Workout', nutrition: { kcal: 300, protein: 20, carbs: 34, fat: 8 }, goals: ['muscle-gain'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Muscle Gain - veg meals --- */
  { sortOrder: 43, slug: 'paneer-gainer-thali', name: 'Paneer Gainer Thali', price: 229, category: 'Lunch & Dinner', nutrition: { kcal: 780, protein: 46, carbs: 82, fat: 26 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: true, isTodaysSpecial: false },
  { sortOrder: 44, slug: 'soy-chunks-pulao', name: 'Soy Chunks Pulao', price: 169, category: 'Lunch & Dinner', nutrition: { kcal: 560, protein: 34, carbs: 72, fat: 14 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 45, slug: 'chole-paneer-rice', name: 'Chole & Paneer Rice', price: 199, category: 'Lunch & Dinner', nutrition: { kcal: 680, protein: 32, carbs: 84, fat: 22 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 46, slug: 'tofu-matar-chapati-thali', name: 'Tofu Matar & Chapati Thali', price: 199, category: 'Lunch & Dinner', nutrition: { kcal: 620, protein: 34, carbs: 68, fat: 20 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 47, slug: 'rajma-rice-special', name: 'Rajma Rice Special', price: 199, category: 'Lunch & Dinner', nutrition: { kcal: 640, protein: 26, carbs: 96, fat: 14 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 48, slug: 'dal-makhani-paneer-paratha', name: 'Dal Makhani & Paneer Paratha', price: 209, category: 'Lunch & Dinner', nutrition: { kcal: 760, protein: 32, carbs: 78, fat: 34 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 49, slug: 'mix-sprouts-tofu-thali', name: 'Mix Sprouts & Tofu Thali', price: 199, category: 'Lunch & Dinner', nutrition: { kcal: 580, protein: 34, carbs: 62, fat: 18 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Muscle Gain - non-veg meals --- */
  { sortOrder: 50, slug: 'classic-chicken-rice', name: 'Classic Chicken & Rice', price: 249, category: 'Lunch & Dinner', nutrition: { kcal: 720, protein: 52, carbs: 82, fat: 18 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 51, slug: 'chicken-keema-paratha', name: 'Chicken Keema Paratha', price: 239, category: 'Lunch & Dinner', nutrition: { kcal: 700, protein: 42, carbs: 62, fat: 30 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 52, slug: 'masala-fish-bhakri', name: 'Masala Fish & Bhakri', price: 349, category: 'Lunch & Dinner', nutrition: { kcal: 680, protein: 48, carbs: 58, fat: 26 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 53, slug: 'egg-bhurji-pulao', name: 'Egg Bhurji Pulao', price: 179, category: 'Lunch & Dinner', nutrition: { kcal: 620, protein: 28, carbs: 68, fat: 26 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 54, slug: 'chicken-pasta-special', name: 'Chicken Pasta Special', price: 249, category: 'Lunch & Dinner', nutrition: { kcal: 740, protein: 46, carbs: 84, fat: 24 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 55, slug: 'chicken-sukka-rice-thali', name: 'Chicken Sukka & Rice Thali', price: 299, category: 'Lunch & Dinner', nutrition: { kcal: 820, protein: 52, carbs: 86, fat: 24 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: true },
  { sortOrder: 56, slug: 'tawa-fish-jeera-rice', name: 'Tawa Fish & Jeera Rice', price: 299, category: 'Lunch & Dinner', nutrition: { kcal: 700, protein: 46, carbs: 78, fat: 20 }, goals: ['muscle-gain'], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Basic Fitness - pre-workout --- */
  { sortOrder: 57, slug: 'fruit-green-tea', name: 'Fruit Green Tea', price: 99, category: 'Pre-Workout', nutrition: { kcal: 80, protein: 1, carbs: 19, fat: 0 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 58, slug: 'honey-brown-toast', name: 'Honey Brown Toast', price: 99, category: 'Pre-Workout', nutrition: { kcal: 220, protein: 7, carbs: 40, fat: 4 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 59, slug: 'apple-citrus-cleanse', name: 'Apple & Citrus Cleanse', price: 99, category: 'Pre-Workout', nutrition: { kcal: 110, protein: 1, carbs: 27, fat: 0 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 60, slug: 'classic-cornflakes-bowl', name: 'Classic Cornflakes Bowl', price: 89, category: 'Pre-Workout', nutrition: { kcal: 260, protein: 8, carbs: 48, fat: 4 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 61, slug: 'pomegranate-bowl', name: 'Pomegranate Bowl', price: 129, category: 'Pre-Workout', nutrition: { kcal: 150, protein: 3, carbs: 33, fat: 2 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 62, slug: 'sweet-rice-cakes', name: 'Sweet Rice Cakes', price: 129, category: 'Pre-Workout', nutrition: { kcal: 200, protein: 4, carbs: 42, fat: 2 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 63, slug: 'mixed-fruit-medley', name: 'Mixed Fruit Medley', price: 149, category: 'Pre-Workout', nutrition: { kcal: 170, protein: 2, carbs: 40, fat: 1 }, goals: ['basic-fitness'], timing: ['pre-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Basic Fitness - post-workout --- */
  { sortOrder: 64, slug: 'power-omelette', name: 'Power Omelette', price: 99, category: 'Post-Workout', nutrition: { kcal: 280, protein: 22, carbs: 6, fat: 18 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 65, slug: 'zesty-sprouts-chaat', name: 'Zesty Sprouts Chaat', price: 99, category: 'Post-Workout', nutrition: { kcal: 190, protein: 12, carbs: 28, fat: 4 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 66, slug: 'whey-milk-booster', name: 'Whey & Milk Booster', price: 169, category: 'Post-Workout', nutrition: { kcal: 300, protein: 30, carbs: 24, fat: 8 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 67, slug: 'light-paneer-bhurji', name: 'Light Paneer Bhurji', price: 129, category: 'Post-Workout', nutrition: { kcal: 280, protein: 20, carbs: 12, fat: 17 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 68, slug: 'boiled-savory-chana', name: 'Boiled Savory Chana', price: 99, category: 'Post-Workout', nutrition: { kcal: 220, protein: 12, carbs: 32, fat: 5 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 69, slug: 'natural-banana-milkshake', name: 'Natural Banana Milkshake', price: 99, category: 'Post-Workout', nutrition: { kcal: 260, protein: 9, carbs: 44, fat: 6 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 70, slug: 'fitness-chicken-sandwich', name: 'Fitness Chicken Sandwich', price: 129, category: 'Post-Workout', nutrition: { kcal: 380, protein: 30, carbs: 38, fat: 11 }, goals: ['basic-fitness'], timing: ['post-workout'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Basic Fitness - veg meals --- */
  { sortOrder: 71, slug: 'homestyle-diet-thali', name: 'Homestyle Diet Thali', price: 179, category: 'Lunch & Dinner', nutrition: { kcal: 560, protein: 22, carbs: 74, fat: 16 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: true, isTodaysSpecial: false },
  { sortOrder: 72, slug: 'methi-chapati-curd', name: 'Methi Chapati & Curd', price: 149, category: 'Lunch & Dinner', nutrition: { kcal: 380, protein: 16, carbs: 52, fat: 11 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 73, slug: 'veg-pulao-creamy-raita', name: 'Veg Pulao & Creamy Raita', price: 169, category: 'Lunch & Dinner', nutrition: { kcal: 520, protein: 15, carbs: 76, fat: 16 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 74, slug: 'moong-dal-khichdi-special', name: 'Moong Dal Khichdi Special', price: 129, category: 'Lunch & Dinner', nutrition: { kcal: 430, protein: 18, carbs: 62, fat: 9 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: true },
  { sortOrder: 75, slug: 'bhendi-sabji-bhakri-thali', name: 'Bhendi Sabji & Bhakri Thali', price: 179, category: 'Lunch & Dinner', nutrition: { kcal: 480, protein: 14, carbs: 66, fat: 16 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 76, slug: 'soya-chunk-curry-rice', name: 'Soya Chunk Curry & Rice', price: 179, category: 'Lunch & Dinner', nutrition: { kcal: 540, protein: 32, carbs: 68, fat: 14 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 77, slug: 'diet-style-paneer-kolhapuri', name: 'Diet Style Paneer Kolhapuri', price: 179, category: 'Lunch & Dinner', nutrition: { kcal: 500, protein: 26, carbs: 44, fat: 24 }, goals: ['basic-fitness'], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Steam meals --- */
  { sortOrder: 85, slug: 'steamed-chicken-drumstick', name: 'Steamed Chicken Drumstick', price: 249, category: 'Salads & Steam', nutrition: { kcal: 320, protein: 38, carbs: 4, fat: 16 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 86, slug: 'steamed-omelette', name: 'Steamed Omelette', price: 199, category: 'Salads & Steam', nutrition: { kcal: 240, protein: 20, carbs: 4, fat: 16 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 87, slug: 'steamed-egg-salad', name: 'Steamed Egg Salad', price: 179, category: 'Salads & Steam', nutrition: { kcal: 260, protein: 18, carbs: 10, fat: 16 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Salads --- */
  { sortOrder: 90, slug: 'veg-green-salad', name: 'Veg Green Salad', price: 79, category: 'Salads & Steam', nutrition: { kcal: 120, protein: 4, carbs: 18, fat: 4 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 91, slug: 'veg-caesar-salad', name: 'Veg Caesar Salad', price: 119, category: 'Salads & Steam', nutrition: { kcal: 280, protein: 9, carbs: 20, fat: 18 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 92, slug: 'grilled-chicken-salad', name: 'Grilled Chicken Salad', price: 199, category: 'Salads & Steam', nutrition: { kcal: 390, protein: 40, carbs: 14, fat: 18 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 93, slug: 'mix-fruit-salad', name: 'Mix Fruit Salad', price: 149, category: 'Salads & Steam', nutrition: { kcal: 180, protein: 2, carbs: 42, fat: 1 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 94, slug: 'greek-salad', name: 'Greek Salad', price: 129, category: 'Salads & Steam', nutrition: { kcal: 260, protein: 8, carbs: 16, fat: 18 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Indian section --- */
  { sortOrder: 95, slug: 'chicken-thali', name: 'Chicken Thali', price: 279, category: 'Indian & Tandoor', nutrition: { kcal: 780, protein: 46, carbs: 78, fat: 30 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 96, slug: 'mutton-thali', name: 'Mutton Thali', price: 399, category: 'Indian & Tandoor', nutrition: { kcal: 880, protein: 48, carbs: 76, fat: 42 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 97, slug: 'fish-thali', name: 'Fish Thali', price: 279, category: 'Indian & Tandoor', nutrition: { kcal: 740, protein: 44, carbs: 76, fat: 26 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 98, slug: 'butter-chicken', name: 'Butter Chicken', price: 329, category: 'Indian & Tandoor', nutrition: { kcal: 690, protein: 38, carbs: 24, fat: 48 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 99, slug: 'chicken-curry', name: 'Chicken Curry', price: 269, category: 'Indian & Tandoor', nutrition: { kcal: 520, protein: 40, carbs: 18, fat: 32 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 100, slug: 'tawa-chicken', name: 'Tawa Chicken', price: 269, category: 'Indian & Tandoor', nutrition: { kcal: 480, protein: 42, carbs: 12, fat: 30 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 101, slug: 'mutton-curry-rogan-josh', name: 'Mutton Curry / Rogan Josh', price: 399, category: 'Indian & Tandoor', nutrition: { kcal: 620, protein: 40, carbs: 14, fat: 44 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 102, slug: 'paneer-butter-masala', name: 'Paneer Butter Masala', price: 239, category: 'Indian & Tandoor', nutrition: { kcal: 560, protein: 22, carbs: 24, fat: 42 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 103, slug: 'dal-bukhara', name: 'Dal Bukhara', price: 299, category: 'Indian & Tandoor', nutrition: { kcal: 420, protein: 18, carbs: 42, fat: 20 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 104, slug: 'dal-tadka', name: 'Dal Tadka', price: 199, category: 'Indian & Tandoor', nutrition: { kcal: 300, protein: 16, carbs: 38, fat: 10 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 105, slug: 'dal-fry', name: 'Dal Fry', price: 149, category: 'Indian & Tandoor', nutrition: { kcal: 280, protein: 15, carbs: 36, fat: 9 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Tandoor section --- */
  { sortOrder: 106, slug: 'tandoori-chicken', name: 'Tandoori Chicken', price: 429, category: 'Indian & Tandoor', nutrition: { kcal: 560, protein: 62, carbs: 8, fat: 30 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 107, slug: 'chicken-tikka', name: 'Chicken Tikka', price: 399, category: 'Indian & Tandoor', nutrition: { kcal: 420, protein: 48, carbs: 8, fat: 22 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 108, slug: 'malai-chicken-tikka', name: 'Malai Chicken Tikka', price: 409, category: 'Indian & Tandoor', nutrition: { kcal: 520, protein: 44, carbs: 10, fat: 34 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 109, slug: 'tandoori-fish', name: 'Tandoori Fish', price: 299, category: 'Indian & Tandoor', nutrition: { kcal: 380, protein: 44, carbs: 6, fat: 20 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 110, slug: 'malai-broccoli', name: 'Malai Broccoli', price: 249, category: 'Indian & Tandoor', nutrition: { kcal: 320, protein: 12, carbs: 18, fat: 24 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 111, slug: 'malai-paneer-tikka', name: 'Malai Paneer Tikka', price: 249, category: 'Indian & Tandoor', nutrition: { kcal: 480, protein: 26, carbs: 14, fat: 36 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 112, slug: 'saffron-paneer-tikka', name: 'Saffron Paneer Tikka', price: 299, category: 'Indian & Tandoor', nutrition: { kcal: 460, protein: 26, carbs: 12, fat: 34 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 113, slug: 'tandoori-mushroom', name: 'Tandoori Mushroom', price: 249, category: 'Indian & Tandoor', nutrition: { kcal: 260, protein: 10, carbs: 16, fat: 18 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },

  /* --- Add-ons --- */
  { sortOrder: 200, slug: 'bhakri', name: 'Bhakri', price: 29, category: 'Add-ons', nutrition: { kcal: 120, protein: 3, carbs: 24, fat: 1 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 201, slug: 'chapati', name: 'Chapati', price: 19, category: 'Add-ons', nutrition: { kcal: 90, protein: 3, carbs: 18, fat: 1 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 202, slug: 'tandoori-roti', name: 'Tandoori Roti', price: 39, category: 'Add-ons', nutrition: { kcal: 140, protein: 4, carbs: 27, fat: 2 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 203, slug: 'butter-roti', name: 'Butter Roti', price: 49, category: 'Add-ons', nutrition: { kcal: 180, protein: 4, carbs: 27, fat: 6 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 204, slug: 'garlic-roti', name: 'Garlic Roti', price: 59, category: 'Add-ons', nutrition: { kcal: 190, protein: 5, carbs: 28, fat: 7 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 205, slug: 'butter-garlic-roti', name: 'Butter Garlic Roti', price: 79, category: 'Add-ons', nutrition: { kcal: 220, protein: 5, carbs: 28, fat: 10 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 206, slug: 'steam-rice', name: 'Steam Rice', price: 99, category: 'Add-ons', nutrition: { kcal: 280, protein: 6, carbs: 62, fat: 1 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 207, slug: 'brown-rice', name: 'Brown Rice', price: 139, category: 'Add-ons', nutrition: { kcal: 260, protein: 6, carbs: 55, fat: 2 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 208, slug: 'butter-milk', name: 'Butter Milk', price: 19, category: 'Add-ons', nutrition: { kcal: 40, protein: 2, carbs: 5, fat: 1 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 209, slug: 'curd-bowl', name: 'Curd Bowl', price: 29, category: 'Add-ons', nutrition: { kcal: 100, protein: 6, carbs: 8, fat: 5 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 210, slug: 'grilled-chicken-100-g', name: 'Grilled Chicken (100 g)', price: 119, category: 'Add-ons', nutrition: { kcal: 165, protein: 31, carbs: 0, fat: 4 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 211, slug: 'grilled-fish-100-g', name: 'Grilled Fish (100 g)', price: 129, category: 'Add-ons', nutrition: { kcal: 140, protein: 26, carbs: 0, fat: 3 }, goals: [], timing: ['meal'], diet: ['non-veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 212, slug: 'detox-water', name: 'Detox Water', price: 19, category: 'Add-ons', nutrition: { kcal: 15, protein: 0, carbs: 4, fat: 0 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 213, slug: 'alkaline-water', name: 'Alkaline Water', price: 19, category: 'Add-ons', nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
  { sortOrder: 214, slug: 'vitamin-c-water', name: 'Vitamin C Water', price: 29, category: 'Add-ons', nutrition: { kcal: 25, protein: 0, carbs: 6, fat: 0 }, goals: [], timing: ['meal'], diet: ['veg'], isBestseller: false, isTodaysSpecial: false },
]

/**
 * Idempotent seed, run on every boot.
 *
 * The admin and chef accounts exist ONLY here - no route can create them.
 * This is what makes "only one admin" enforceable (CLAUDE.md 10).
 */
export async function seed(): Promise<void> {
  await seedStaffAccount('admin', config.admin)
  await seedStaffAccount('chef', config.chef)

  const dishCount = await Dish.countDocuments()
  if (dishCount === 0) {
    await Dish.insertMany(
      MENU.map((d) => ({ ...d, description: '', ingredients: '', image: '', availableToday: true })),
    )
    console.log('[seed] inserted ' + MENU.length + ' dishes from the kitchen menu')
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
  console.log('[seed] created ' + role + ' account: ' + account.email)
}
