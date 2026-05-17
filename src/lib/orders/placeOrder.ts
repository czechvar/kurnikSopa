import type { Payload } from 'payload'
import type { Cart, Product, User, SiteSetting } from '@/payload-types'

import { generateOrderNumber } from './orderNumber'
import { deriveCzIban } from '@/lib/payment/iban'
import { buildSpayd } from '@/lib/payment/spayd'
import { renderQrPng } from '@/lib/payment/qr'
import {
  orderConfirmationSubject,
  orderConfirmationTemplate,
  staffNotificationSubject,
  staffNotificationTemplate,
  type OrderConfirmationInput,
  type StaffNotificationInput,
} from '@/lib/email/templates'

export type PlaceOrderInput = {
  user: User
  cart: Cart
  locale: 'cs' | 'en'
  customer: { firstName: string; lastName: string; phone: string }
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; zip: string } | null
  preferredDate: string   // ISO yyyy-mm-dd
  customerNote?: string | null
  paymentMethod: 'bank_transfer' | 'cash_on_delivery'
}

export type ValidationError = {
  productId: number | string
  productName: string
  code: 'outOfStock' | 'insufficientStock' | 'belowMinimumOrder' | 'outOfSeason' | 'productNotFound'
  min?: number
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; errors: ValidationError[]; reason?: 'paymentMethodMissingBankDetails' | 'cartEmpty' }

export async function placeOrder(payload: Payload, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.cart.items || input.cart.items.length === 0) {
    return { ok: false, errors: [], reason: 'cartEmpty' }
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

  // ── Validate stock ─────────────────────────────────────────────────────
  const errors: ValidationError[] = []
  const today = new Date()
  for (const item of input.cart.items) {
    const pid = (typeof item.product === 'object' ? item.product.id : item.product) as number
    const p = byId.get(pid)
    if (!p) { errors.push({ productId: pid, productName: '?', code: 'productNotFound' }); continue }
    const pname = (typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[input.locale]) ?? '?'
    if (!p.inStock) { errors.push({ productId: pid, productName: pname, code: 'outOfStock' }); continue }
    if (typeof p.stockQuantity === 'number' && p.stockQuantity < item.quantity) {
      errors.push({ productId: pid, productName: pname, code: 'insufficientStock' }); continue
    }
    if (typeof p.minimumOrder === 'number' && item.quantity < p.minimumOrder) {
      errors.push({ productId: pid, productName: pname, code: 'belowMinimumOrder', min: p.minimumOrder }); continue
    }
    if (p.seasonal) {
      const from = p.availableFrom ? new Date(p.availableFrom) : null
      const to   = p.availableTo   ? new Date(p.availableTo)   : null
      if ((from && today < from) || (to && today > to)) {
        errors.push({ productId: pid, productName: pname, code: 'outOfSeason' }); continue
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  // ── Load SiteSettings (for FIO + farm address + notification email) ────
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  if (input.paymentMethod === 'bank_transfer') {
    const pay = settings.payment
    if (!pay?.accountNumber || !pay?.bankCode) {
      return { ok: false, errors: [], reason: 'paymentMethodMissingBankDetails' }
    }
  }

  // ── Snapshot prices + total ────────────────────────────────────────────
  const items = input.cart.items.map(it => {
    const pid = (typeof it.product === 'object' ? it.product.id : it.product) as number
    const p = byId.get(pid)!
    return {
      product: pid,
      quantity: it.quantity,
      priceAtPurchase: p.price,
    }
  })
  const totalAmount = items.reduce((sum, it) => sum + it.priceAtPurchase * it.quantity, 0)

  const orderNumber = await generateOrderNumber(payload)

  // ── Compose SPAYD if bank_transfer ─────────────────────────────────────
  let qrSpayd: string | null = null
  let qrPng: Buffer | null = null
  if (input.paymentMethod === 'bank_transfer') {
    const pay = settings.payment!
    const iban = deriveCzIban(pay.accountPrefix ?? '', pay.accountNumber!, pay.bankCode!)
    qrSpayd = buildSpayd({
      iban,
      amount: totalAmount,
      variableSymbol: orderNumber,
      message: `Kurnik Sopa ${orderNumber}`,
    })
    qrPng = await renderQrPng(qrSpayd)
  }

  // ── Create the order ───────────────────────────────────────────────────
  const order = await payload.create({
    collection: 'orders',
    data: {
      orderNumber,
      customer: input.user.id as number,
      items,
      totalAmount,
      deliveryMethod: input.deliveryMethod,
      deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress ?? undefined : undefined,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'received',
      preferredDate: input.preferredDate,
      customerNote: input.customerNote ?? undefined,
      locale: input.locale,
      qrSpayd: qrSpayd ?? undefined,
    },
    depth: 0,
  })

  // ── Clear cart ─────────────────────────────────────────────────────────
  try {
    await payload.delete({ collection: 'carts', id: input.cart.id })
  } catch (e) {
    payload.logger.warn(`Failed to clear cart after order ${orderNumber}: ${String(e)}`)
  }

  // ── Send customer confirmation ─────────────────────────────────────────
  try {
    const itemsForEmail = items.map(it => {
      const p = byId.get(it.product as number)!
      const pname = (typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[input.locale]) ?? '?'
      return {
        name: pname,
        quantity: it.quantity,
        unitPrice: it.priceAtPurchase,
        lineTotal: it.priceAtPurchase * it.quantity,
        unit: p.unit ?? null,
      }
    })

    const ocInput: OrderConfirmationInput = {
      locale: input.locale,
      orderNumber,
      customerFirstName: input.user.firstName ?? null,
      items: itemsForEmail,
      totalAmount,
      deliveryMethod: input.deliveryMethod,
      deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress ?? null : null,
      farmAddress: {
        street: settings.address?.street ?? '',
        city:   settings.address?.city   ?? '',
        zip:    settings.address?.zip    ?? '',
      },
      farmPhone: settings.contact?.phone ?? null,
      farmOpeningHours: settings.openingHours ?? null,
      preferredDate: formatDateLocale(input.preferredDate, input.locale),
      customerNote: input.customerNote ?? null,
      paymentMethod: input.paymentMethod,
      bank: input.paymentMethod === 'bank_transfer' && qrSpayd
        ? {
            account: {
              prefix: settings.payment?.accountPrefix ?? null,
              account: settings.payment!.accountNumber!,
              bankCode: settings.payment!.bankCode!,
              bankName: settings.payment?.bankName ?? null,
            },
            iban: deriveCzIban(settings.payment?.accountPrefix ?? '', settings.payment!.accountNumber!, settings.payment!.bankCode!),
            amountFormatted: `${Math.round(totalAmount).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`,
            vs: orderNumber,
            messageForRecipient: `Kurnik Sopa ${orderNumber}`,
          }
        : null,
      ownerName: settings.owner ?? 'Kurník Šopa',
      hasQrCid: Boolean(qrPng),
    }

    const html = orderConfirmationTemplate(ocInput)
    const subject = orderConfirmationSubject(ocInput)
    const to = input.user.email

    const attachments = qrPng
      ? [{ filename: 'order-qr.png', content: qrPng, cid: 'order-qr', contentType: 'image/png' }]
      : undefined

    await payload.sendEmail({
      to,
      subject,
      html,
      replyTo: settings.contact?.email ?? undefined,
      attachments,
    } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`Failed to send order confirmation for ${orderNumber}: ${String(e)}`)
  }

  // ── Send staff notification ────────────────────────────────────────────
  try {
    if (settings.notificationEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const adminUrl = `${baseUrl}/admin/collections/orders/${order.id}`

      const sn: StaffNotificationInput = {
        orderNumber,
        customerName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
        customerEmail: input.user.email,
        customerPhone: input.customer.phone ?? null,
        totalAmount,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress ?? null : null,
        preferredDate: formatDateLocale(input.preferredDate, 'cs'),
        customerNote: input.customerNote ?? null,
        items: items.map(it => {
          const p = byId.get(it.product as number)!
          const pname = (typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.cs) ?? '?'
          return { name: pname, quantity: it.quantity, lineTotal: it.priceAtPurchase * it.quantity }
        }),
        adminUrl,
      }

      await payload.sendEmail({
        to: settings.notificationEmail,
        subject: staffNotificationSubject(sn),
        html: staffNotificationTemplate(sn),
        replyTo: input.user.email,
      } as Parameters<typeof payload.sendEmail>[0])
    } else {
      payload.logger.warn(`No SiteSettings.notificationEmail set — skipping staff notification for ${orderNumber}`)
    }
  } catch (e) {
    payload.logger.warn(`Failed to send staff notification for ${orderNumber}: ${String(e)}`)
  }

  return { ok: true, orderNumber }
}

function formatDateLocale(iso: string, locale: 'cs' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}
