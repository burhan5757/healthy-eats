import mongoose, { Schema } from 'mongoose'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../shared/index.js'

/**
 * The COD ledger. One record per order — created 'pending' when the order is
 * placed, flipped to 'collected' when admin marks it delivered, or 'void' if
 * the order is cancelled first. There is no payment gateway (CLAUDE.md §3:
 * cash on delivery only), so this is a record of cash expected/collected,
 * not a transaction.
 */
const paymentSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    orderNumber: { type: String, required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    collectedAt: { type: Date },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
  },
  { timestamps: true },
)

paymentSchema.index({ status: 1, createdAt: -1 })

export const Payment = mongoose.model('Payment', paymentSchema)
