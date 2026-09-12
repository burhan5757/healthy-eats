import mongoose, { Schema,                      } from 'mongoose'
import { DIETS, GOALS, TIMINGS } from '../../../shared/index.js'

const dishSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    /** Short one-line ingredient list shown on menu grid cards. */
    ingredients: { type: String, default: '' },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },

    // Optional — see the note on `nutrition` in shared/index.ts.
    nutrition: {
      type: {
        kcal: { type: Number, required: true, min: 0 },
        protein: { type: Number, required: true, min: 0 },
        carbs: { type: Number, required: true, min: 0 },
        fat: { type: Number, required: true, min: 0 },
      },
      default: undefined,
    },

    goals: [{ type: String, enum: GOALS }],
    timing: [{ type: String, enum: TIMINGS }],
    diet: [{ type: String, enum: DIETS }],

    isBestseller: { type: Boolean, default: false },
    isTodaysSpecial: { type: Boolean, default: false },

    /** Curated display order. The bestsellers rail is merchandised, not alphabetical. */
    sortOrder: { type: Number, default: 0 },

    /** Set false when admin cancels an order citing this dish. */
    availableToday: { type: Boolean, default: true },
    /** Date-stamp of the sell-out, used for the automatic daily reset. */
    soldOutOn: { type: String, default: null },
  },
  { timestamps: true },
)

;                                                                                          

export const Dish = mongoose.model         ('Dish', dishSchema)

/** Local (IST-agnostic) calendar day key used for the sold-out reset. */
export function todayKey()         {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
}

/**
 * Restores availability for dishes sold out on a previous day.
 * Cheap enough to call before any menu read.
 */
export async function resetStaleSoldOut()                {
  await Dish.updateMany(
    { availableToday: false, soldOutOn: { $ne: todayKey() } },
    { $set: { availableToday: true, soldOutOn: null } },
  )
}
