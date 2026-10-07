import type { Payload, PayloadRequest } from 'payload'
import type { Batch, Order, PickupPoint, SiteSetting } from '@/payload-types'
import { datesConfirmedSubject, datesConfirmedTemplate, type DatesConfirmedInput } from '@/lib/email/templates'
import { formatDay, orderLink, orderLocale, orderRecipient } from '@/lib/orders/orderEmails'

/** The pickup days of a batch, formatted for one locale. */
export function pickupDaysFor(batch: Batch, locale: 'cs' | 'en'): Array<{ day: string; point: string }> {
  return (batch.pickupDays ?? []).map(d => {
    const point = d.pickupPoint && typeof d.pickupPoint === 'object' ? (d.pickupPoint as PickupPoint).name : ''
    return { day: formatDay(d.date, locale), point }
  })
}

/**
 * The owner opened a batch: every booked order on it gets "dates confirmed,
 * please confirm by …". One email per order; a failure is logged per
 * recipient and never stops the rest.
 */
export async function notifyBatchOpened(payload: Payload, batchId: number, req?: PayloadRequest): Promise<number> {
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, req })) as SiteSetting
  const orders = await payload.find({
    collection: 'orders',
    where: { and: [{ batch: { equals: batchId } }, { orderStatus: { equals: 'booked' } }] },
    depth: 0,
    limit: 500,
    req,
  })
  let sent = 0
  for (const order of orders.docs as Order[]) {
    const locale = orderLocale(order)
    const batch = (await payload.findByID({ collection: 'batches', id: batchId, depth: 1, locale, req })) as Batch
    const recipient = await orderRecipient(payload, order, req)
    if (!recipient) continue
    const input: DatesConfirmedInput = {
      locale,
      orderNumber: String(order.orderNumber),
      customerFirstName: recipient.firstName,
      batchLabel: batch.label,
      pickupDays: pickupDaysFor(batch, locale),
      deadline: formatDay(batch.confirmationDeadline, locale),
      orderUrl: orderLink(order),
      farmPhone: settings.contact?.phone ?? null,
    }
    try {
      await payload.sendEmail({
        to: recipient.to,
        subject: datesConfirmedSubject(input),
        html: datesConfirmedTemplate(input),
        replyTo: settings.contact?.email ?? undefined,
      } as Parameters<typeof payload.sendEmail>[0])
      sent += 1
    } catch (e) {
      payload.logger.warn(`dates-confirmed email failed for ${order.orderNumber}: ${String(e)}`)
    }
  }
  return sent
}
