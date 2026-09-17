import { BUSINESS_TIME_ZONE, dayKey } from './shared/index.js'
import { Order } from './models/Order.js'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Admin's revenue monitoring (CLAUDE.md §7), computed inside MongoDB so the
 * cost doesn't grow with every order ever placed. Days are the kitchen's
 * days (IST), whatever zone the server runs in. Revenue counts delivered
 * orders only.
 */
export async function orderStats(now = new Date()) {
  // Eight days back comfortably covers the last seven IST calendar days.
  const since = new Date(now.getTime() - 8 * DAY_MS)

  const [facets] = await Order.aggregate([
    {
      $facet: {
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              total: { $sum: '$total' },
            },
          },
        ],
        recent: [
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                    timezone: BUSINESS_TIME_ZONE,
                  },
                },
                delivered: { $eq: ['$status', 'delivered'] },
              },
              count: { $sum: 1 },
              total: { $sum: '$total' },
            },
          },
        ],
        topDishes: [
          { $match: { status: 'delivered' } },
          // Newest first, so a renamed dish shows its latest name.
          { $sort: { createdAt: -1 } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.dishId',
              name: { $first: '$items.name' },
              qty: { $sum: '$items.qty' },
              revenue: {
                $sum: { $multiply: ['$items.price', '$items.qty'] },
              },
            },
          },
          { $sort: { revenue: -1, name: 1 } },
          { $limit: 8 },
          { $project: { _id: 0, name: 1, qty: 1, revenue: 1 } },
        ],
      },
    },
  ])

  const status = (s) =>
    facets.byStatus.find((row) => row._id === s) ?? { count: 0, total: 0 }
  const delivered = status('delivered')

  const today = dayKey(now)
  const deliveredOn = (day) =>
    facets.recent
      .filter((row) => row._id.day === day && row._id.delivered)
      .reduce((sum, row) => sum + row.total, 0)

  const daily = []
  for (let d = 6; d >= 0; d--) {
    const date = dayKey(new Date(now.getTime() - d * DAY_MS))
    daily.push({ date, revenue: deliveredOn(date) })
  }

  return {
    todayRevenue: deliveredOn(today),
    todayOrders: facets.recent
      .filter((row) => row._id.day === today)
      .reduce((sum, row) => sum + row.count, 0),
    pending: status('placed').count,
    inKitchen: status('preparing').count,
    averageOrderValue: delivered.count
      ? Math.round(delivered.total / delivered.count)
      : 0,
    lostToCancellations: status('cancelled').total,
    daily,
    topDishes: facets.topDishes,
  }
}
