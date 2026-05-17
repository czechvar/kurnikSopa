import type { CollectionAfterChangeHook } from 'payload'
import {
  paymentReceivedSubject,
  paymentReceivedTemplate,
  orderShippedSubject,
  orderShippedTemplate,
  type PaymentReceivedInput,
  type OrderShippedInput,
} from '@/lib/email/templates'
import type { SiteSetting, User } from '@/payload-types'

export const sendStatusEmails: CollectionAfterChangeHook = async ({
  doc, previousDoc, operation, req,
}) => {
  if (operation !== 'update') return doc
  if (!previousDoc) return doc

  const customerId = typeof doc.customer === 'object' ? doc.customer?.id : doc.customer
  if (!customerId) return doc

  let customer: User
  try {
    customer = (await req.payload.findByID({ collection: 'users', id: customerId, depth: 0 })) as User
  } catch {
    return doc
  }
  const settings = (await req.payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  const locale = (doc.locale === 'en' || doc.locale === 'cs') ? doc.locale : 'cs'

  // Payment received
  if (previousDoc.paymentStatus !== 'paid' && doc.paymentStatus === 'paid') {
    const input: PaymentReceivedInput = {
      locale,
      orderNumber: String(doc.orderNumber),
      customerFirstName: customer.firstName ?? null,
      deliveryMethod: doc.deliveryMethod,
    }
    try {
      await req.payload.sendEmail({
        to: customer.email,
        subject: paymentReceivedSubject(input),
        html: paymentReceivedTemplate(input),
        replyTo: settings.contact?.email ?? undefined,
      } as Parameters<typeof req.payload.sendEmail>[0])
    } catch (e) {
      req.payload.logger.warn(`Failed to send payment-received email for ${doc.orderNumber}: ${String(e)}`)
    }
  }

  // Order shipped / ready
  if (previousDoc.orderStatus !== doc.orderStatus && doc.orderStatus === 'shipped') {
    const input: OrderShippedInput = {
      locale,
      orderNumber: String(doc.orderNumber),
      customerFirstName: customer.firstName ?? null,
      deliveryMethod: doc.deliveryMethod,
      farmAddress: {
        street: settings.address?.street ?? '',
        city:   settings.address?.city   ?? '',
        zip:    settings.address?.zip    ?? '',
      },
      farmPhone: settings.contact?.phone ?? null,
      farmOpeningHours: settings.openingHours ?? null,
    }
    try {
      await req.payload.sendEmail({
        to: customer.email,
        subject: orderShippedSubject(input),
        html: orderShippedTemplate(input),
        replyTo: settings.contact?.email ?? undefined,
      } as Parameters<typeof req.payload.sendEmail>[0])
    } catch (e) {
      req.payload.logger.warn(`Failed to send order-shipped email for ${doc.orderNumber}: ${String(e)}`)
    }
  }

  return doc
}
