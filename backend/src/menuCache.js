import { Dish, resetStaleSoldOut, todayKey } from './models/Dish.js'
import { toDish } from './serialize.js'

/**
 * The public menu, held in memory. Every page load reads it and it changes
 * rarely, so serving it from memory saves two Atlas round trips per request.
 * Cleared whenever a dish changes in this process, and at midnight. The short
 * TTL covers changes made elsewhere (another instance, the images script).
 */
const TTL_MS = 60_000
let cached = null // { day, at, dishes }

export async function getMenu() {
  const day = todayKey()
  if (cached && cached.day === day && Date.now() - cached.at < TTL_MS) {
    return cached.dishes
  }
  await resetStaleSoldOut()
  const docs = await Dish.find().sort({ sortOrder: 1, name: 1 }).lean()
  cached = { day, at: Date.now(), dishes: docs.map(toDish) }
  return cached.dishes
}

export function invalidateMenu() {
  cached = null
}
