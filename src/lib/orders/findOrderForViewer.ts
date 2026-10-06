import { timingSafeEqual } from 'node:crypto'
import type { Payload } from 'payload'
import type { Order, User } from '@/payload-types'

/**
 * Load one order for whoever is looking at it, or null.
 *
 * Order numbers are sequential, so the number alone proves nothing. A viewer
 * sees the order when they hold its access token (the link from the
 * confirmation email), when it is theirs, or when they are staff.
 */
export async function findOrderForViewer(
  payload: Payload,
  viewer: { orderNumber: string; user: User | null; token: string | null },
): Promise<Order | null> {
  const found = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: viewer.orderNumber } },
    limit: 1,
    depth: 1,
  })
  const order = found.docs[0]
  if (!order) return null

  if (viewer.token && typeof order.accessToken === 'string' && safeEqual(order.accessToken, viewer.token)) {
    return order
  }

  const u = viewer.user
  if (!u) return null
  if (u.role === 'admin' || u.role === 'staff') return order
  const customerId = typeof order.customer === 'object' ? order.customer?.id : order.customer
  if (customerId && customerId === u.id) return order
  if (order.guestEmail && u.email && order.guestEmail.toLowerCase() === u.email.toLowerCase()) return order
  return null
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}
