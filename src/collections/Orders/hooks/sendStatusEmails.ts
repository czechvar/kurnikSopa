import type { CollectionAfterChangeHook } from 'payload'
import {
  orderReadySubject,
  orderReadyTemplate,
  type OrderReadyInput,
} from '@/lib/email/templates'
import { buildOrderUrl } from '@/lib/email/links'
import type { PickupPoint, SiteSetting, User } from '@/payload-types'

/**
 * Tell the customer when their order is ready to collect. Fires once, on the
 * transition into `shipped` ("ready for pickup"). Reaches account holders by
 * their account email and guests by the email they gave at checkout.
 */
export const sendStatusEmails: CollectionAfterChangeHook = async ({
  doc, previousDoc, operation, req,
}) => {
  if (operation !== 'update') return doc
  if (!previousDoc) return doc
  if (previousDoc.orderStatus === doc.orderStatus || doc.orderStatus !== 'shipped') return doc

  const customerId = typeof doc.customer === 'object' ? doc.customer?.id : doc.customer
  let to: string | null = null
  let firstName: string | null = null
  if (customerId) {
    try {
      const customer = (await req.payload.findByID({ collection: 'users', id: customerId, depth: 0 })) as User
      to = customer.email
      firstName = customer.firstName ?? null
    } catch {
      to = null
    }
  }
  if (!to && typeof doc.guestEmail === 'string' && doc.guestEmail) {
    to = doc.guestEmail
    firstName = typeof doc.guestName === 'string' ? doc.guestName.split(' ')[0] ?? null : null
  }
  if (!to) return doc

  const settings = (await req.payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const locale = (doc.locale === 'en' || doc.locale === 'cs') ? doc.locale : 'cs'

  const pickupPointId = typeof doc.pickupPoint === 'object' ? doc.pickupPoint?.id : doc.pickupPoint
  let pickupPoint: PickupPoint | null = null
  if (pickupPointId) {
    try {
      pickupPoint = (await req.payload.findByID({ collection: 'pickup-points', id: pickupPointId, depth: 0, locale })) as PickupPoint
    } catch {
      pickupPoint = null
    }
  }

  const input: OrderReadyInput = {
    locale,
    orderNumber: String(doc.orderNumber),
    customerFirstName: firstName,
    pickupPoint: pickupPoint
      ? { name: pickupPoint.name, street: pickupPoint.street, city: pickupPoint.city, zip: pickupPoint.zip, note: pickupPoint.note ?? null }
      : {
          name: settings.farmName,
          street: settings.address?.street ?? '',
          city: settings.address?.city ?? '',
          zip: settings.address?.zip ?? '',
          note: settings.openingHours ?? null,
        },
    farmPhone: settings.contact?.phone ?? null,
    totalAmount: doc.totalAmount,
    orderUrl: typeof doc.accessToken === 'string' ? buildOrderUrl(locale, String(doc.orderNumber), doc.accessToken) : null,
  }
  try {
    await req.payload.sendEmail({
      to,
      subject: orderReadySubject(input),
      html: orderReadyTemplate(input),
      replyTo: settings.contact?.email ?? undefined,
    } as Parameters<typeof req.payload.sendEmail>[0])
  } catch (e) {
    req.payload.logger.warn(`Failed to send order-ready email for ${doc.orderNumber}: ${String(e)}`)
  }

  return doc
}
