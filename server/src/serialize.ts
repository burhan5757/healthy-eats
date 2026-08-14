import type { Dish, Order, PublicUser } from '../../shared/index.js'
import type { DishDoc } from './models/Dish.js'
import type { OrderDoc } from './models/Order.js'
import type { UserDoc } from './models/User.js'

/** Mongoose docs → the shared wire shapes. `_id` never leaks to the client. */

export function toDish(d: DishDoc): Dish {
  // Mongoose types nested subdocuments as optional; schema-level `required`
  // guarantees they exist on any persisted document.
  const nutrition = d.nutrition!
  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    description: d.description ?? '',
    ingredients: d.ingredients ?? '',
    category: d.category,
    price: d.price,
    image: d.image ?? '',
    nutrition: {
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    },
    goals: d.goals as Dish['goals'],
    timing: d.timing as Dish['timing'],
    diet: d.diet as Dish['diet'],
    isBestseller: d.isBestseller,
    isTodaysSpecial: d.isTodaysSpecial,
    availableToday: d.availableToday,
  }
}

export function toOrder(o: OrderDoc): Order {
  const address = o.address!
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    customerId: o.customerId ? String(o.customerId) : undefined,
    items: o.items.map((i) => ({
      dishId: String(i.dishId),
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    packaging: o.packaging ?? 0,
    total: o.total,
    address: {
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      landmark: address.landmark ?? '',
      pincode: address.pincode,
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
    },
    notes: o.notes ?? '',
    status: o.status as Order['status'],
    timeline: o.timeline.map((t) => ({ status: t.status as Order['status'], at: t.at })),
    cancellation: o.cancellation
      ? {
          reason: o.cancellation.reason,
          soldOutDishIds: o.cancellation.soldOutDishIds.map(String),
        }
      : undefined,
    createdAt: (o as unknown as { createdAt: Date }).createdAt.toISOString(),
  }
}

export function toPublicUser(u: UserDoc): PublicUser {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as PublicUser['role'],
  }
}
