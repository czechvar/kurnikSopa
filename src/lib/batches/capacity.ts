import type { Payload, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { Order } from '@/payload-types'
import { drizzleFor } from '@/lib/db/transactionDb'

/** Order statuses that hold units of a Batch. Released and cancelled orders do not. */
export const COUNTED_STATUSES: ReadonlyArray<NonNullable<Order['orderStatus']>> = ['booked', 'confirmed', 'ready', 'picked_up']

/** Batch statuses a Customer may still book against. */
export const BOOKABLE_STATUSES = ['planned', 'open'] as const

export function isCounted(status: string | null | undefined): boolean {
  return Boolean(status) && (COUNTED_STATUSES as readonly string[]).includes(status as string)
}

export function orderQuantity(items: Array<{ quantity: number }> | null | undefined): number {
  return (items ?? []).reduce((sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 0), 0)
}

/** Units an order holds against its batch: its quantity while counted, else 0. */
export function heldUnits(order: { orderStatus?: string | null; items?: Array<{ quantity: number }> | null }): number {
  return isCounted(order.orderStatus) ? orderQuantity(order.items) : 0
}

/**
 * Move a Batch's `bookedCount` by `delta` in one atomic statement. An increase
 * only applies while it fits under `capacity`; otherwise `batchFull` is
 * thrown, which rolls back the order write that caused it when both share
 * the request's transaction. Two customers racing for the last bird can
 * therefore never both win.
 */
export async function adjustBookedCount(payload: Payload, batchId: number, delta: number, req?: PayloadRequest): Promise<void> {
  if (delta === 0) return
  const db = drizzleFor(payload, req)
  const guard = delta > 0 ? sql` AND "booked_count" + ${delta} <= "capacity"` : sql``
  const result = await db.execute(sql`
    UPDATE "batches"
    SET "booked_count" = GREATEST(0, COALESCE("booked_count", 0) + ${delta}), "updated_at" = now()
    WHERE "id" = ${batchId}${guard}
    RETURNING "id"`)
  const rows = Array.isArray(result) ? result : (result.rows ?? [])
  if (rows.length === 0) {
    if (delta > 0) throw new APIError('batchFull', 409)
    throw new APIError('batchNotFound', 404)
  }
}
