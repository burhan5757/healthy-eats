import { isNonVeg } from '../../src/shared/index.js'

/**
 * Builds a stock-photo search query for a dish. Descriptions are empty for
 * the whole seeded menu (CLAUDE.md §8b), so the query is built from the
 * dish's own name: marketing/filler words and units are stripped, Indian
 * terms Pexels' library barely indexes are translated to a Western
 * equivalent, and whatever food words remain become the search phrase — with
 * one hard rule: a veg dish must never search for a meat, fish or egg word,
 * even if that word is literally in its name (e.g. "Soy Keema").
 */
export function buildDishImageQuery({ name, category, diet }) {
  const nonVeg = isNonVeg(diet)

  const words = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)

  const kept = []
  for (const w of words) {
    if (STOPWORDS.has(w)) continue
    if (!nonVeg && MEAT_WORDS.has(w)) continue
    kept.push(TRANSLATIONS[w] ?? w)
  }

  const dietWord = nonVeg ? '' : 'vegetarian '
  const core =
    kept.length > 0 ? kept.join(' ') : (CATEGORY_HINTS[category] ?? 'healthy meal')

  return `${dietWord}${core}`.trim()
}

/** Marketing adjectives, generic dish-shape words and units — not searchable food terms. */
const STOPWORDS = new Set([
  'bowl',
  'plate',
  'combo',
  'meal',
  'dish',
  'special',
  'mix',
  'mixed',
  'and',
  'with',
  'style',
  'fusion',
  'recipe',
  'box',
  'pack',
  'fit',
  'fitness',
  'diet',
  'healthy',
  'lean',
  'basic',
  'fat',
  'loss',
  'muscle',
  'gain',
  'protein',
  'high',
  'low',
  'g',
  'kg',
  'ml',
  'pc',
  'pcs',
])

/** Never searched for a veg dish, even when the word appears in its name (e.g. "Soy Keema"). */
const MEAT_WORDS = new Set([
  'chicken',
  'fish',
  'salmon',
  'prawn',
  'mutton',
  'lamb',
  'beef',
  'pork',
  'tuna',
  'egg',
  'eggs',
  'keema',
  'sukka',
])

/** Indian terms translated to what a Western-leaning stock library actually indexes. */
const TRANSLATIONS = {
  bhakri: 'indian flatbread',
  roti: 'indian flatbread',
  chapati: 'indian flatbread',
  paratha: 'stuffed flatbread',
  thali: 'indian platter',
  sabzi: 'vegetable curry',
  sabji: 'vegetable curry',
  dal: 'lentil curry',
  daal: 'lentil curry',
  poha: 'flattened rice',
  idli: 'steamed rice cake',
  dosa: 'crepe',
  upma: 'semolina porridge',
  khichdi: 'rice lentil porridge',
  sprouts: 'sprouts salad',
  tandoori: 'tandoori',
}

const CATEGORY_HINTS = {
  'Pre-Workout': 'energy bowl',
  'Post-Workout': 'protein bowl',
  'Lunch & Dinner': 'healthy meal',
  'Indian & Tandoor': 'indian curry',
  'Salads & Steam': 'salad bowl',
  'Add-ons': 'side dish',
}
