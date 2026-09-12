import mongoose, { Schema } from 'mongoose'
import { ORDER_STATUSES } from '../../../shared/index.js'

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
  },
  { timestamps: true },
)

export const Order = mongoose.model('Order', orderSchema)

/** Human-friendly, kitchen-shoutable order number: HE-4821 */
export function generateOrderNumber() {
  return `HE-${Math.floor(1000 + Math.random() * 9000)}`
}
