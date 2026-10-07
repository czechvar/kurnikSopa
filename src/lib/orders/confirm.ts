import type { Payload } from 'payload'
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from 'payload'
import type { Batch, Order, Product, SiteSetting } from '@/payload-types'
import { isConfirmationOpen } from '@/lib/batches/transitions'
import { batchOrderConfirmedSubject, batchOrderConfirmedTemplate } from '@/lib/email/templates'
import { farmPickupSummary, formatDay, loadPickupPoint, orderLink, orderLocale, orderRecipient, relId } from './orderEmails'

export type ConfirmFailure = 'notABooking' | 'notConfirmable' | 'pickupDayInvalid' | 'batchFull' | 'belowMinimumOrder' | 'quantityInvalid'
export type ConfirmResult = { ok: true; orderStatus: 'confirmed' } | { ok: false; reason: ConfirmFailure; min?: number }

/**
 * The customer confirms a booking once the owner has opened the batch:
 * picks a pickup day (and so a Pickup Point) and may change the quantity
 * within what is left. Allowed until the batch's confirmation deadline.
 */
export async function confirmBooking(
  payload: Payload,
  input: { order: Order; pickupDayIndex: number; quantity?: number | null },
): Promise<ConfirmResult> {
  const { order } = input
  const batchId = relId(order.batch)
  if (!batchId) return { ok: false, reason: 'notABooking' }
  if (order.orderStatus !== 'booked' && order.orderStatus !== 'confirmed') return { ok: false, reason: 'notConfirmable' }

  const locale = orderLocale(order)
  const batch = (await payload.findByID({ collection: 'batches', id: batchId, depth: 0, locale })) as Batch
  if (!isConfirmationOpen(batch)) return { ok: false, reason: 'notConfirmable' }

  const chosen = (batch.pickupDays ?? [])[input.pickupDayIndex]
  if (!chosen) return { ok: false, reason: 'pickupDayInvalid' }

  const line = order.items?.[0]
  if (!line) return { ok: false, reason: 'notABooking' }
  const product = (await payload.findByID({ collection: 'products', id: relId(line.product)!, depth: 0, locale })) as Product
  const quantity = input.quantity ?? line.quantity
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: 'quantityInvalid' }
  if (typeof product.minimumOrder === 'number' && quantity < product.minimumOrder) return { ok: false, reason: 'belowMinimumOrder', min: product.minimumOrder }

  const req = await createLocalReq({}, payload)
  const started = await initTransaction(req)
  let updated: Order
  try {
    updated = (await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        orderStatus: 'confirmed',
        pickupDay: chosen.date,
        pickupPoint: relId(chosen.pickupPoint) ?? undefined,
        items: [{ ...line, product: relId(line.product)!, quantity }],
      },
      depth: 0,
      req,
    })) as Order
    if (started) await commitTransaction(req)
  } catch (e) {
    if (started) await killTransaction(req)
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('batchFull')) return { ok: false, reason: 'batchFull' }
    throw e
  }

  try {
    const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
    const recipient = await orderRecipient(payload, updated)
    if (recipient) {
      const point = (await loadPickupPoint(payload, relId(updated.pickupPoint), locale)) ?? farmPickupSummary(settings)
      const emailInput = {
        locale, orderNumber: String(updated.orderNumber), customerFirstName: recipient.firstName,
        productName: product.name, quantity, estimatedTotal: updated.totalAmount, averageWeight: product.averageWeight ?? null, unitPrice: product.price,
        batchLabel: batch.label, pickupDay: formatDay(updated.pickupDay, locale), pickupPoint: point,
        farmPhone: settings.contact?.phone ?? null, orderUrl: orderLink(updated) ?? '', ownerName: settings.owner ?? 'Kurník Šopa', merged: false,
      }
      await payload.sendEmail({ to: recipient.to, subject: batchOrderConfirmedSubject(emailInput), html: batchOrderConfirmedTemplate(emailInput), replyTo: settings.contact?.email ?? undefined } as Parameters<typeof payload.sendEmail>[0])
    }
  } catch (e) {
    payload.logger.warn(`Failed to send confirmation email for ${updated.orderNumber}: ${String(e)}`)
  }
  return { ok: true, orderStatus: 'confirmed' }
}

export type CancelResult = { ok: true } | { ok: false; reason: 'notABooking' | 'notCancellable' }

/** A customer cancels their own booking, allowed while the batch still takes changes. */
export async function cancelBooking(payload: Payload, order: Order): Promise<CancelResult> {
  const batchId = relId(order.batch)
  if (!batchId) return { ok: false, reason: 'notABooking' }
  if (order.orderStatus !== 'booked' && order.orderStatus !== 'confirmed') return { ok: false, reason: 'notCancellable' }
  const batch = (await payload.findByID({ collection: 'batches', id: batchId, depth: 0 })) as Batch
  const changeable = batch.status === 'planned' || isConfirmationOpen(batch)
  if (!changeable) return { ok: false, reason: 'notCancellable' }
  await payload.update({ collection: 'orders', id: order.id, data: { orderStatus: 'cancelled' }, depth: 0 })
  return { ok: true }
}
