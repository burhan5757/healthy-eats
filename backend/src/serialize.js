/** Mongoose docs → the shared wire shapes. `_id` never leaks to the client. */

export function toDish(d) {
  const nutrition = d.nutrition
  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    description: d.description ?? '',
    ingredients: d.ingredients ?? '',
    category: d.category,
    price: d.price,
    image: d.image ?? '',
    nutrition: nutrition
      ? {
          kcal: nutrition.kcal,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
        }
      : undefined,
    goals: d.goals,
    timing: d.timing,
    diet: d.diet,
    isBestseller: d.isBestseller,
    isTodaysSpecial: d.isTodaysSpecial,
    availableToday: d.availableToday,
    imageSource: d.imageSource ?? 'none',
  }
}

export function toPayment(p) {
  return {
    method: p.method,
    status: p.status,
    amount: p.amount,
    collectedAt: p.collectedAt ? p.collectedAt.toISOString() : undefined,
    voidedAt: p.voidedAt ? p.voidedAt.toISOString() : undefined,
  }
}

export function toOrder(o, payment) {
  const address = o.address
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
    status: o.status,
    timeline: o.timeline.map((t) => ({ status: t.status, at: t.at })),
    cancellation: o.cancellation
      ? {
          reason: o.cancellation.reason,
          soldOutDishIds: o.cancellation.soldOutDishIds.map(String),
        }
      : undefined,
    payment: payment ? toPayment(payment) : undefined,
    driver: o.driver
      ? {
          id: String(o.driver.user),
          name: o.driver.name,
          assignedAt: o.driver.assignedAt.toISOString(),
          acceptedAt: o.driver.acceptedAt
            ? o.driver.acceptedAt.toISOString()
            : undefined,
        }
      : undefined,
    createdAt: o.createdAt.toISOString(),
  }
}

/**
 * What an unauthenticated caller may see about an order — the guest who placed it,
 * or anyone holding its order number. No internal ids, no phone, no payment
 * ledger, no driver identity: nothing that helps find or act on other orders.
 */
export function toPublicOrder(o) {
  const {
    id: _id,
    customerId: _customerId,
    payment: _payment,
    driver,
    address,
    ...rest
  } = toOrder(o)
  const { phone: _phone, ...publicAddress } = address
  return {
    ...rest,
    address: publicAddress,
    driver: driver
      ? { name: driver.name, acceptedAt: driver.acceptedAt }
      : undefined,
  }
}

export function toPublicUser(u) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone || undefined,
    active: u.active !== false,
  }
}
