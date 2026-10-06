import type { Payload, Where } from 'payload'
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from 'payload'
import type { Batch, Order, Product, SiteSetting, User } from '@/payload-types'
import { BOOKABLE_STATUSES } from '@/lib/batches/capacity'
import { isConfirmationOpen } from '@/lib/batches/transitions'
import {
  bookingReceivedSubject,
  bookingReceivedTemplate,
  batchOrderConfirmedSubject,
  batchOrderConfirmedTemplate,
  staffNotificationSubject,
  staffNotificationTemplate,
} from '@/lib/email/templates'
import { farmPickupSummary, formatDay, loadPickupPoint, orderLink, relId } from './orderEmails'

export type BookInput = {
  user: User | null
  guest?: { email: string } | null
  batchId: number
  quantity: number
  /** Index into the batch's pickupDays; required when the batch is open. */
  pickupDayIndex?: number | null
  customer: { firstName: string; lastName: string; phone: string }
  customerNote?: string | null
  locale: 'cs' | 'en'
}

export type BookFailure =
  | 'accountNotActive'
  | 'guestEmailRequired'
  | 'batchNotFound'
  | 'batchNotBookable'
  | 'batchFull'
  | 'belowMinimumOrder'
  | 'pickupDayRequired'
  | 'pickupDayInvalid'
  | 'productNotFound'

export type BookResult =
  | { ok: true; orderNumber: string; accessToken: string; orderStatus: 'booked' | 'confirmed'; merged: boolean }
  | { ok: false; reason: BookFailure; min?: number }

/**
 * Book N units of a batch product (glossary: Booking). On a planned batch
 * the order waits as `booked`; on an open batch the customer picks a pickup
 * day and the order is `confirmed` straight away. A second booking by the
 * same person on the same batch adds to the existing order. The capacity
 * check and the order write share one transaction (see `adjustBookedCount`).
 */
export async function bookBatch(payload: Payload, input: BookInput): Promise<BookResult> {
  if (input.user && input.user.status && input.user.status !== 'active') return { ok: false, reason: 'accountNotActive' }
  const email = input.user ? input.user.email : input.guest?.email?.trim().toLowerCase()
  if (!email) return { ok: false, reason: 'guestEmailRequired' }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) return { ok: false, reason: 'belowMinimumOrder', min: 1 }

  let batch: Batch
  try {
    batch = (await payload.findByID({ collection: 'batches', id: input.batchId, depth: 0, locale: input.locale })) as Batch
  } catch {
    return { ok: false, reason: 'batchNotFound' }
  }
  if (!(BOOKABLE_STATUSES as readonly string[]).includes(batch.status)) return { ok: false, reason: 'batchNotBookable' }

  const productId = relId(batch.product)
  let product: Product
  try {
    product = (await payload.findByID({ collection: 'products', id: productId!, depth: 0, locale: input.locale })) as Product
  } catch {
    return { ok: false, reason: 'productNotFound' }
  }
  if (product.status !== 'published') return { ok: false, reason: 'productNotFound' }

  // Open batch: a pickup day is chosen now; planned batch: later, at confirmation.
  let pickupDay: string | null = null
  let pickupPointId: number | null = null
  if (batch.status === 'open') {
    if (!isConfirmationOpen(batch)) return { ok: false, reason: 'batchNotBookable' }
    const idx = input.pickupDayIndex
    const days = batch.pickupDays ?? []
    if (idx === null || idx === undefined || !Number.isInteger(idx)) return { ok: false, reason: 'pickupDayRequired' }
    const chosen = days[idx]
    if (!chosen) return { ok: false, reason: 'pickupDayInvalid' }
    pickupDay = chosen.date
    pickupPointId = relId(chosen.pickupPoint)
  }

  const customerName = `${input.customer.firstName} ${input.customer.lastName}`.trim()
  const existingWhere: Where = input.user
    ? { and: [{ batch: { equals: batch.id } }, { customer: { equals: input.user.id } }, { orderStatus: { in: ['booked', 'confirmed'] } }] }
    : { and: [{ batch: { equals: batch.id } }, { guestEmail: { equals: email } }, { orderStatus: { in: ['booked', 'confirmed'] } }] }

  const req = await createLocalReq({}, payload)
  const started = await initTransaction(req)
  let order: Order
  let merged = false
  try {
    const existing = await payload.find({ collection: 'orders', where: existingWhere, limit: 1, depth: 0, req })
    const prior = existing.docs[0] as Order | undefined

    if (prior) {
      const line = prior.items?.[0]
      const nextQty = (line?.quantity ?? 0) + input.quantity
      if (typeof product.minimumOrder === 'number' && nextQty < product.minimumOrder) {
        throw Object.assign(new Error('belowMinimumOrder'), { min: product.minimumOrder })
      }
      order = (await payload.update({
        collection: 'orders',
        id: prior.id,
        data: {
          items: [{ product: product.id, quantity: nextQty, priceAtPurchase: line?.priceAtPurchase ?? product.price }],
          customerNote: input.customerNote ?? prior.customerNote ?? undefined,
        },
        depth: 0,
        req,
      })) as Order
      merged = true
    } else {
      if (typeof product.minimumOrder === 'number' && input.quantity < product.minimumOrder) {
        throw Object.assign(new Error('belowMinimumOrder'), { min: product.minimumOrder })
      }
      order = (await payload.create({
        collection: 'orders',
        data: {
          customer: input.user ? input.user.id : undefined,
          guestEmail: input.user ? undefined : email,
          guestName: input.user ? undefined : customerName,
          guestPhone: input.user ? undefined : input.customer.phone,
          batch: batch.id,
          items: [{ product: product.id, quantity: input.quantity, priceAtPurchase: product.price }],
          totalAmount: 0,
          pickupPoint: pickupPointId ?? undefined,
          pickupDay: pickupDay ?? undefined,
          deliveryMethod: 'pickup',
          paymentMethod: 'cash',
          paymentStatus: 'unpaid',
          customerNote: input.customerNote ?? undefined,
          locale: input.locale,
        },
        depth: 0,
        req,
      })) as Order
    }
    if (started) await commitTransaction(req)
  } catch (e) {
    if (started) await killTransaction(req)
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('batchFull')) return { ok: false, reason: 'batchFull' }
    if (message.includes('belowMinimumOrder')) return { ok: false, reason: 'belowMinimumOrder', min: (e as { min?: number }).min }
    if (message.includes('batchNotBookable')) return { ok: false, reason: 'batchNotBookable' }
    if (message.includes('pickupDayRequired')) return { ok: false, reason: 'pickupDayRequired' }
    throw e
  }

  await sendBookingEmails(payload, { order, batch, product, email, customerName, phone: input.customer.phone, hasAccount: Boolean(input.user), merged })

  return {
    ok: true,
    orderNumber: String(order.orderNumber),
    accessToken: String(order.accessToken),
    orderStatus: order.orderStatus === 'confirmed' ? 'confirmed' : 'booked',
    merged,
  }
}

async function sendBookingEmails(
  payload: Payload,
  args: { order: Order; batch: Batch; product: Product; email: string; customerName: string; phone: string; hasAccount: boolean; merged: boolean },
): Promise<void> {
  const { order, batch, product } = args
  const locale: 'cs' | 'en' = order.locale === 'en' ? 'en' : 'cs'
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const quantity = order.items?.[0]?.quantity ?? 0
  const firstName = args.customerName.split(' ')[0] ?? null
  const url = orderLink(order) ?? ''

  try {
    if (order.orderStatus === 'confirmed') {
      const point = (await loadPickupPoint(payload, relId(order.pickupPoint), locale)) ?? farmPickupSummary(settings)
      const input = {
        locale, orderNumber: String(order.orderNumber), customerFirstName: firstName,
        productName: product.name, quantity, estimatedTotal: order.totalAmount, averageWeight: product.averageWeight ?? null, unitPrice: product.price,
        batchLabel: batch.label, pickupDay: formatDay(order.pickupDay, locale), pickupPoint: point,
        farmPhone: settings.contact?.phone ?? null, orderUrl: url, ownerName: settings.owner ?? 'Kurník Šopa', merged: args.merged,
      }
      await payload.sendEmail({ to: args.email, subject: batchOrderConfirmedSubject(input), html: batchOrderConfirmedTemplate(input), replyTo: settings.contact?.email ?? undefined } as Parameters<typeof payload.sendEmail>[0])
    } else {
      const input = {
        locale, orderNumber: String(order.orderNumber), customerFirstName: firstName,
        productName: product.name, quantity, estimatedTotal: order.totalAmount, averageWeight: product.averageWeight ?? null, unitPrice: product.price,
        batchLabel: batch.label, orderUrl: url, ownerName: settings.owner ?? 'Kurník Šopa', isGuest: !args.hasAccount, merged: args.merged,
      }
      await payload.sendEmail({ to: args.email, subject: bookingReceivedSubject(input), html: bookingReceivedTemplate(input), replyTo: settings.contact?.email ?? undefined } as Parameters<typeof payload.sendEmail>[0])
    }
  } catch (e) {
    payload.logger.warn(`Failed to send booking email for ${order.orderNumber}: ${String(e)}`)
  }

  if (!settings.notificationEmail) return
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const sn = {
      orderNumber: String(order.orderNumber),
      customerName: args.customerName,
      customerEmail: args.email,
      customerPhone: args.phone,
      hasAccount: args.hasAccount,
      totalAmount: order.totalAmount,
      pickupPointName: order.pickupDay ? `${batch.label} · ${formatDay(order.pickupDay, 'cs')}` : `${batch.label} (termín upřesníme)`,
      preferredDate: null,
      customerNote: order.customerNote ?? null,
      items: [{ name: product.name, quantity, lineTotal: order.totalAmount }],
      adminUrl: `${baseUrl}/admin/collections/orders/${order.id}`,
      isBooking: true,
    }
    await payload.sendEmail({ to: settings.notificationEmail, subject: staffNotificationSubject(sn), html: staffNotificationTemplate(sn), replyTo: args.email } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`Failed to send staff booking notification for ${order.orderNumber}: ${String(e)}`)
  }
}
