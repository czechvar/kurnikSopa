import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

type Item = { product: number | { id: number }; quantity: number }

/**
 * The server, not the stepper, enforces each product's minimum order. Before
 * this a PATCH to /api/carts could hold 2 eggs when the farm sells 20 at a
 * time, and the customer only found out at the last checkout step.
 */
export const validateCartItems: CollectionBeforeChangeHook = async ({ data, req }) => {
  const items = Array.isArray(data.items) ? (data.items as Item[]) : null
  if (!items || items.length === 0) return data

  const ids = [...new Set(items.map(it => (typeof it.product === 'object' ? it.product.id : it.product)))]
  const products = await req.payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    req,
  })
  const byId = new Map(products.docs.map(p => [p.id, p]))

  for (const it of items) {
    const pid = typeof it.product === 'object' ? it.product.id : it.product
    const p = byId.get(pid)
    if (!p) throw new APIError(`productNotFound:${pid}`, 400)
    if (!Number.isInteger(it.quantity) || it.quantity < 1) throw new APIError(`quantityInvalid:${pid}`, 400)
    if (typeof p.minimumOrder === 'number' && it.quantity < p.minimumOrder) {
      throw new APIError(`belowMinimumOrder:${pid}:${p.minimumOrder}`, 400)
    }
  }
  return data
}
