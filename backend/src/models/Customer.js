import mongoose, { Schema } from 'mongoose'

/**
 * A guest-checkout customer profile, upserted by phone number on every order.
 * There is no login here — this exists purely so admin can see repeat
 * customers and their delivery history. See CLAUDE.md §10a (guest checkout).
 */
const customerSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },

    addresses: [
      {
        line1: { type: String, required: true },
        landmark: { type: String, default: '' },
        pincode: { type: String, required: true },
        lat: { type: Number },
        lng: { type: Number },
        lastUsedAt: { type: Date, required: true },
      },
    ],

    orderCount: { type: Number, default: 0 },
    firstOrderAt: { type: Date },
    lastOrderAt: { type: Date },
  },
  { timestamps: true },
)

export const Customer = mongoose.model('Customer', customerSchema)

/**
 * Upserts a customer by phone, refreshing their name and adding/refreshing
 * the delivery address they just used. Addresses are deduplicated on
 * line1+pincode rather than kept as a growing unbounded log.
 */
export async function recordCustomerOrder(address) {
  const now = new Date()
  const customer = await Customer.findOneAndUpdate(
    { phone: address.phone },
    {
      $set: { name: address.name, lastOrderAt: now },
      $inc: { orderCount: 1 },
      $setOnInsert: { firstOrderAt: now },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const existing = customer.addresses.find(
    (a) => a.line1 === address.line1 && a.pincode === address.pincode,
  )
  if (existing) {
    existing.landmark = address.landmark ?? ''
    existing.lat = address.lat
    existing.lng = address.lng
    existing.lastUsedAt = now
  } else {
    customer.addresses.push({
      line1: address.line1,
      landmark: address.landmark ?? '',
      pincode: address.pincode,
      lat: address.lat,
      lng: address.lng,
      lastUsedAt: now,
    })
  }
  await customer.save()
  return customer
}
