import type { Payload, PayloadRequest } from 'payload'
import type { Batch, Order, PickupPoint, Product, SiteSetting, User } from '@/payload-types'
import { buildOrderUrl } from '@/lib/email/links'
import type { PickupPointSummary } from '@/lib/email/templates'

type Locale = 'cs' | 'en'

export function orderLocale(order: Pick<Order, 'locale'>): Locale {
  return order.locale === 'en' ? 'en' : 'cs'
}

export function formatDay(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Who gets the emails for an order: the account holder, or the guest email. */
export async function orderRecipient(payload: Payload, order: Order, req?: PayloadRequest): Promise<{ to: string; firstName: string | null } | null> {
  const customerId = typeof order.customer === 'object' ? order.customer?.id : order.customer
  if (customerId) {
    try {
      const customer = (await payload.findByID({ collection: 'users', id: customerId, depth: 0, req })) as User
      return { to: customer.email, firstName: customer.firstName ?? null }
    } catch {
      /* fall through to the guest email */
    }
  }
  if (order.guestEmail) return { to: order.guestEmail, firstName: order.guestName?.split(' ')[0] ?? null }
  return null
}

export function orderLink(order: Order): string | null {
  return typeof order.accessToken === 'string' && order.accessToken
    ? buildOrderUrl(orderLocale(order), String(order.orderNumber), order.accessToken)
    : null
}

export async function loadPickupPoint(payload: Payload, id: number | null | undefined, locale: Locale, req?: PayloadRequest): Promise<PickupPointSummary | null> {
  if (!id) return null
  try {
    const p = (await payload.findByID({ collection: 'pickup-points', id, depth: 0, locale, req })) as PickupPoint
    return { name: p.name, street: p.street, city: p.city, zip: p.zip, note: p.note ?? null }
  } catch {
    return null
  }
}

export function farmPickupSummary(settings: SiteSetting): PickupPointSummary {
  return {
    name: settings.farmName,
    street: settings.address?.street ?? '',
    city: settings.address?.city ?? '',
    zip: settings.address?.zip ?? '',
    note: settings.openingHours ?? null,
  }
}

export async function loadProductName(payload: Payload, id: number | null | undefined, locale: Locale, req?: PayloadRequest): Promise<string> {
  if (!id) return '?'
  try {
    const p = (await payload.findByID({ collection: 'products', id, depth: 0, locale, req })) as Product
    return p.name
  } catch {
    return '?'
  }
}

export async function loadBatch(payload: Payload, id: number | null | undefined, locale: Locale, req?: PayloadRequest): Promise<Batch | null> {
  if (!id) return null
  try {
    return (await payload.findByID({ collection: 'batches', id, depth: 1, locale, req })) as Batch
  } catch {
    return null
  }
}

export const relId = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number((v as { id: number }).id) : null
