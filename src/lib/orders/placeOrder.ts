import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'
import type { Cart, PickupPoint, Product, User, SiteSetting } from '@/payload-types'

import { generateOrderNumber } from './orderNumber'
import { availabilityOf } from '@/lib/products/availability'
import { buildOrderUrl } from '@/lib/email/links'
import {
  orderConfirmationSubject,
  orderConfirmationTemplate,
  staffNotificationSubject,
  staffNotificationTemplate,
  type OrderConfirmationInput,
  type StaffNotificationInput,
} from '@/lib/email/templates'

export type PlaceOrderInput = {
  /** The signed-in customer, or null for a guest. */
  user: User | null
  /** Required when `user` is null. */
  guest?: { email: string } | null
  cart: Cart
  locale: 'cs' | 'en'
  customer: { firstName: string; lastName: string; phone: string }
  pickupPointId: number
  preferredDate: string   // ISO yyyy-mm-dd
  customerNote?: string | null
}

export type ValidationError = {
  productId: number | string
  productName: string
  code: 'outOfStock' | 'insufficientStock' | 'belowMinimumOrder' | 'outOfSeason' | 'productNotFound'
  min?: number
}

export type PlaceOrderFailure = 'cartEmpty' | 'pickupPointInvalid' | 'guestEmailRequired' | 'accountNotActive'

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; accessToken: string }
  | { ok: false; errors: ValidationError[]; reason?: PlaceOrderFailure }

function localizedName(p: Product, locale: 'cs' | 'en'): string {
  return (typeof p.name === 'string' ? p.name : (p.name as unknown as Record<string, string>)?.[locale]) ?? '?'
}

/**
 * Turn a cart into an Order: validate every line, snapshot prices, record the
 * pickup point, email the customer (with a tokenised link to the order) and
 * the farm, and clear the cart. Payment is cash at pickup, so nothing here
 * touches money beyond the total.
 */
export async function placeOrder(payload: Payload, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.cart.items || input.cart.items.length === 0) {
    return { ok: false, errors: [], reason: 'cartEmpty' }
  }
  if (!input.user && !input.guest?.email) {
    return { ok: false, errors: [], reason: 'guestEmailRequired' }
  }
  if (input.user && input.user.status && input.user.status !== 'active') {
    return { ok: false, errors: [], reason: 'accountNotActive' }
  }

  const productIds = input.cart.items.map(it =>
    typeof it.product === 'object' ? it.product.id : it.product,
  )
  const products = await payload.find({
    collection: 'products',
    where: { id: { in: productIds } },
    depth: 0,
    limit: productIds.length,
  })
  const byId = new Map<number, Product>(products.docs.map(p => [p.id as number, p]))

  // ── Validate every line ────────────────────────────────────────────────
  const errors: ValidationError[] = []
  for (const item of input.cart.items) {
    const pid = (typeof item.product === 'object' ? item.product.id : item.product) as number
    const p = byId.get(pid)
    if (!p || p.status !== 'published') { errors.push({ productId: pid, productName: '?', code: 'productNotFound' }); continue }
    const pname = localizedName(p, input.locale)
    const availability = availabilityOf(p)
    if (!availability.available) { errors.push({ productId: pid, productName: pname, code: availability.reason }); continue }
    if (typeof p.stockQuantity === 'number' && p.stockQuantity < item.quantity) {
      errors.push({ productId: pid, productName: pname, code: 'insufficientStock' }); continue
    }
    if (typeof p.minimumOrder === 'number' && item.quantity < p.minimumOrder) {
      errors.push({ productId: pid, productName: pname, code: 'belowMinimumOrder', min: p.minimumOrder }); continue
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  // ── Pickup point must exist and be active ──────────────────────────────
  let pickupPoint: PickupPoint | null = null
  try {
    pickupPoint = (await payload.findByID({
      collection: 'pickup-points',
      id: input.pickupPointId,
      depth: 0,
      locale: input.locale,
    })) as PickupPoint
  } catch {
    pickupPoint = null
  }
  if (!pickupPoint || pickupPoint.active === false) {
    return { ok: false, errors: [], reason: 'pickupPointInvalid' }
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  // ── Snapshot prices + total ────────────────────────────────────────────
  const items = input.cart.items.map(it => {
    const pid = (typeof it.product === 'object' ? it.product.id : it.product) as number
    const p = byId.get(pid)!
    return { product: pid, quantity: it.quantity, priceAtPurchase: p.price }
  })
  const totalAmount = items.reduce((sum, it) => sum + it.priceAtPurchase * it.quantity, 0)

  const orderNumber = await generateOrderNumber(payload)
  const accessToken = randomBytes(24).toString('base64url')

  const customerName = `${input.customer.firstName} ${input.customer.lastName}`.trim()
  const email = input.user ? input.user.email : input.guest!.email

  // ── Create the order ───────────────────────────────────────────────────
  const order = await payload.create({
    collection: 'orders',
    data: {
      orderNumber,
      accessToken,
      customer: input.user ? (input.user.id as number) : undefined,
      guestEmail: input.user ? undefined : email,
      guestName: input.user ? undefined : customerName,
      guestPhone: input.user ? undefined : input.customer.phone,
      items,
      totalAmount,
      pickupPoint: pickupPoint.id,
      deliveryMethod: 'pickup',
      paymentMethod: 'cash',
      paymentStatus: 'unpaid',
      orderStatus: 'received',
      preferredDate: input.preferredDate,
      customerNote: input.customerNote ?? undefined,
      locale: input.locale,
    },
    depth: 0,
  })

  // ── Clear cart ─────────────────────────────────────────────────────────
  try {
    await payload.delete({ collection: 'carts', id: input.cart.id })
  } catch (e) {
    payload.logger.warn(`Failed to clear cart after order ${orderNumber}: ${String(e)}`)
  }

  const pickup = {
    name: pickupPoint.name,
    street: pickupPoint.street,
    city: pickupPoint.city,
    zip: pickupPoint.zip,
    note: pickupPoint.note ?? null,
  }
  const orderUrl = buildOrderUrl(input.locale, orderNumber, accessToken)

  // ── Customer confirmation ──────────────────────────────────────────────
  try {
    const oc: OrderConfirmationInput = {
      locale: input.locale,
      orderNumber,
      customerFirstName: input.customer.firstName || input.user?.firstName || null,
      items: items.map(it => {
        const p = byId.get(it.product)!
        return {
          name: localizedName(p, input.locale),
          quantity: it.quantity,
          unitPrice: it.priceAtPurchase,
          lineTotal: it.priceAtPurchase * it.quantity,
          unit: p.unit ?? null,
        }
      }),
      totalAmount,
      pickupPoint: pickup,
      farmPhone: settings.contact?.phone ?? null,
      preferredDate: formatDateLocale(input.preferredDate, input.locale),
      customerNote: input.customerNote ?? null,
      ownerName: settings.owner ?? 'Kurník Šopa',
      orderUrl,
      isGuest: !input.user,
    }
    await payload.sendEmail({
      to: email,
      subject: orderConfirmationSubject(oc),
      html: orderConfirmationTemplate(oc),
      replyTo: settings.contact?.email ?? undefined,
    } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`Failed to send order confirmation for ${orderNumber}: ${String(e)}`)
  }

  // ── Staff notification ─────────────────────────────────────────────────
  try {
    if (settings.notificationEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const sn: StaffNotificationInput = {
        orderNumber,
        customerName,
        customerEmail: email,
        customerPhone: input.customer.phone ?? null,
        hasAccount: Boolean(input.user),
        totalAmount,
        pickupPointName: typeof pickup.name === 'string' ? pickup.name : String(pickup.name),
        preferredDate: formatDateLocale(input.preferredDate, 'cs'),
        customerNote: input.customerNote ?? null,
        items: items.map(it => {
          const p = byId.get(it.product)!
          return { name: localizedName(p, 'cs'), quantity: it.quantity, lineTotal: it.priceAtPurchase * it.quantity }
        }),
        adminUrl: `${baseUrl}/admin/collections/orders/${order.id}`,
      }
      await payload.sendEmail({
        to: settings.notificationEmail,
        subject: staffNotificationSubject(sn),
        html: staffNotificationTemplate(sn),
        replyTo: email,
      } as Parameters<typeof payload.sendEmail>[0])
    } else {
      payload.logger.warn(`No SiteSettings.notificationEmail set — skipping staff notification for ${orderNumber}`)
    }
  } catch (e) {
    payload.logger.warn(`Failed to send staff notification for ${orderNumber}: ${String(e)}`)
  }

  return { ok: true, orderNumber, accessToken }
}

function formatDateLocale(iso: string, locale: 'cs' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}
