import { randomInt } from 'node:crypto'
import mongoose, { Schema } from 'mongoose'
import { ORDER_STATUSES } from '../shared/index.js'

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    /** Absent for guest orders — the normal case. Present only for staff-placed ones. */
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    /** The guest-checkout Customer profile, upserted by phone at order time. */
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
      index: true,
    },

    items: [
      {
        dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
        name: { type: String, required: true }, // snapshot — survives menu edits
        price: { type: Number, required: true, min: 0 }, // snapshot — price at order time
        qty: { type: Number, required: true, min: 1 },
      },
    ],

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    packaging: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },

    address: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      landmark: { type: String, default: '' },
      pincode: { type: String, required: true },
      lat: { type: Number },
      lng: { type: Number },
    },

    /** Kitchen note from the customer — allergies etc. Shown on the chef ticket. */
    notes: { type: String, default: '', maxlength: 200 },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: 'placed',
      index: true,
    },
    timeline: [
      {
        status: { type: String, enum: ORDER_STATUSES, required: true },
        at: { type: String, required: true },
      },
    ],

    cancellation: {
      type: {
        reason: { type: String, required: true },
        soldOutDishIds: [{ type: Schema.Types.ObjectId, ref: 'Dish' }],
      },
      default: undefined,
    },

    /** Assigned by admin once READY. `acceptedAt` set = out for delivery. */
    driver: {
      type: {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true }, // snapshot — no populate needed
        assignedAt: { type: Date, required: true },
        acceptedAt: { type: Date },
      },
      default: undefined,
    },
  },
  { timestamps: true },
)

orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ 'driver.user': 1, status: 1 })

export const Order = mongoose.model('Order', orderSchema)

// No 0/O or 1/I, so a customer can read the number back without ambiguity.
const ORDER_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const ORDER_CODE_LENGTH = 8
export const ORDER_NUMBER_PATTERN = new RegExp(
  `^HE-[${ORDER_ALPHABET}]{${ORDER_CODE_LENGTH}}$`,
)

/**
 * HE-7K4QXNPT. The order number is what unlocks the public tracking page, so it
 * is a secret, not a counter: 32^8 ≈ 10^12 values from a CSPRNG, so nobody can
 * enumerate other customers' orders (CLAUDE.md §10b).
 */
export function generateOrderNumber() {
  let code = ''
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)]
  }
  return `HE-${code}`
}
