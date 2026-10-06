import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'
import { randomBytes } from 'node:crypto'
import { generateOrderNumber } from '@/lib/orders/orderNumber'
import { lockWithinTransaction } from '@/lib/db/transactionDb'
import { BOOKABLE_STATUSES, adjustBookedCount, heldUnits, isCounted, orderQuantity } from '@/lib/batches/capacity'
import type { Batch, Product } from '@/payload-types'

type Item = { product: number | { id: number }; quantity: number; priceAtPurchase?: number | null; estimatedTotal?: number | null }

const relId = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number((v as { id: number }).id) : null

/**
 * Every order needs a number and an access token, whether it comes from the
 * storefront or from Staff typing in a phone order in the admin.
 */
export const prepareOrder: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data
  const next = { ...data }
  if (!next.orderNumber) {
    await lockWithinTransaction(req.payload, req, 'orders:orderNumber')
    next.orderNumber = await generateOrderNumber(req.payload, new Date(), req)
  }
  if (!next.accessToken) next.accessToken = randomBytes(24).toString('base64url')
  return next
}

/**
 * Orders on a Batch follow the batch's rules: only bookable batches take new
 * orders, an open batch needs a pickup day and point, prices are snapshotted
 * from the product when Staff leave them blank, and the estimate is
 * quantity × average weight × price per kilo.
 */
export const applyBatchRules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const batchId = relId(data.batch ?? originalDoc?.batch)
  if (!batchId) return data

  const batch = (await req.payload.findByID({ collection: 'batches', id: batchId, depth: 0, req })) as Batch
  const items = ((data.items ?? originalDoc?.items ?? []) as Item[]).map(it => ({ ...it }))
  if (items.length === 0) throw new APIError('itemsRequired', 400)

  // Snapshot prices and estimates for lines that lack them.
  const productIds = [...new Set(items.map(it => relId(it.product)).filter((v): v is number => v !== null))]
  const products = await req.payload.find({ collection: 'products', where: { id: { in: productIds } }, depth: 0, limit: productIds.length, req })
  const byId = new Map<number, Product>(products.docs.map(p => [p.id, p]))
  for (const it of items) {
    const p = byId.get(relId(it.product)!)
    if (!p) throw new APIError('productNotFound', 400)
    if (typeof it.priceAtPurchase !== 'number') it.priceAtPurchase = p.price
    const perUnit = p.soldBy === 'batch' && typeof p.averageWeight === 'number' && p.averageWeight > 0 ? p.averageWeight : 1
    it.estimatedTotal = Math.round(it.quantity * perUnit * it.priceAtPurchase)
  }
  const totalAmount = items.reduce((sum, it) => sum + (it.estimatedTotal ?? 0), 0)

  const next: Record<string, unknown> = { ...data, items, totalAmount, deliveryMethod: 'pickup', paymentMethod: 'cash' }

  if (operation === 'create') {
    if (!(BOOKABLE_STATUSES as readonly string[]).includes(batch.status)) throw new APIError('batchNotBookable', 409)
    // The field default is 'confirmed', so an incoming 'confirmed' or 'booked'
    // says nothing; the batch decides. Only an explicit later status survives.
    const explicit = typeof data.orderStatus === 'string' && ['ready', 'picked_up', 'cancelled', 'released'].includes(data.orderStatus)
      ? data.orderStatus
      : null
    const status = explicit ?? (batch.status === 'open' ? 'confirmed' : 'booked')
    if (status === 'confirmed' && (!data.pickupDay || !relId(data.pickupPoint))) throw new APIError('pickupDayRequired', 400)
    if (isCounted(status) && (batch.bookedCount ?? 0) + orderQuantity(items) > batch.capacity) throw new APIError('batchFull', 409)
    next.orderStatus = status
    if (status === 'confirmed' && !data.confirmedAt) next.confirmedAt = new Date().toISOString()
    return next
  }

  const prevHeld = heldUnits(originalDoc ?? {})
  const nextStatus = (data.orderStatus ?? originalDoc?.orderStatus) as string | undefined
  const nextHeld = isCounted(nextStatus) ? orderQuantity(items) : 0
  if (nextHeld - prevHeld > 0 && (batch.bookedCount ?? 0) + (nextHeld - prevHeld) > batch.capacity) throw new APIError('batchFull', 409)
  if (nextStatus === 'confirmed' && originalDoc?.orderStatus !== 'confirmed' && !data.confirmedAt) next.confirmedAt = new Date().toISOString()
  if (nextStatus === 'released' && !data.releasedAt) next.releasedAt = new Date().toISOString()
  if (nextStatus === 'picked_up' && !data.pickedUpAt) next.pickedUpAt = new Date().toISOString()
  return next
}

/**
 * Keep `Batch.bookedCount` equal to the units held by its orders. Runs for
 * every write, whoever made it: storefront, Staff in the admin, or the cron.
 */
export const syncBookedCount: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const batchId = relId(doc.batch)
  const prevBatchId = operation === 'update' ? relId(previousDoc?.batch) : null
  const nextHeld = batchId ? heldUnits(doc) : 0
  const prevHeld = prevBatchId ? heldUnits(previousDoc ?? {}) : 0

  if (batchId && prevBatchId && batchId !== prevBatchId) {
    await adjustBookedCount(req.payload, prevBatchId, -prevHeld, req)
    await adjustBookedCount(req.payload, batchId, nextHeld, req)
    return doc
  }
  const target = batchId ?? prevBatchId
  if (!target) return doc
  await adjustBookedCount(req.payload, target, nextHeld - prevHeld, req)
  return doc
}
