import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import {
  createTestUser,
  createTestProduct,
  createTestCart,
  setTestSiteSettings,
} from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails, capturedEmails } from '../../setup/email-spy'
import { placeOrder } from '@/lib/orders/placeOrder'

describe('placeOrder — happy paths', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  it('places a bank_transfer order with QR, snapshots prices, sends 2 emails, clears cart', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { price: 250 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 3 }])

    // Reset emails before placeOrder so that the Payload auth verification
    // email sent during createTestUser is not counted in the assertions.
    resetEmails()

    const result = await placeOrder(payload, {
      user,
      cart,
      locale: 'cs',
      customer: { firstName: 'Jan', lastName: 'Novák', phone: '+420123456789' },
      deliveryMethod: 'pickup',
      preferredDate: '2026-06-01',
      paymentMethod: 'bank_transfer',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return // type narrow
    // Order numbers are YYYYNNNNNN — 10 digits total.
    expect(result.orderNumber).toMatch(/^2026\d{6}$/)

    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(1)
    const order = orders.docs[0]
    expect(order.totalAmount).toBe(750)
    expect(order.items?.[0]?.priceAtPurchase).toBe(250)
    expect(order.qrSpayd).toContain('SPD*1.0')
    expect(order.qrSpayd).toContain('AM:750.00')

    const carts = await payload.find({ collection: 'carts', limit: 1 })
    expect(carts.docs).toHaveLength(0)

    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails[0].subject).toContain(result.orderNumber)
    expect(capturedEmails[0].attachments?.[0]).toMatchObject({ cid: 'order-qr' })
    expect(capturedEmails[1].to).toBe('staff@kurnik-sopa.cz')
  })

  it('places a cash_on_delivery order without QR or attachment', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { price: 100 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 2 }])

    // Reset emails before placeOrder to exclude the auth verification email.
    resetEmails()

    const result = await placeOrder(payload, {
      user,
      cart,
      locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '+420...' },
      deliveryMethod: 'pickup',
      preferredDate: '2026-06-01',
      paymentMethod: 'cash_on_delivery',
    })

    expect(result.ok).toBe(true)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs[0].qrSpayd).toBeFalsy()
    expect(capturedEmails[0].attachments).toBeFalsy()
  })

  it('persists deliveryAddress only when deliveryMethod is delivery', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])

    const result = await placeOrder(payload, {
      user,
      cart,
      locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '+420...' },
      deliveryMethod: 'delivery',
      deliveryAddress: { street: 'Lipová 5', city: 'Brno', zip: '60200' },
      preferredDate: '2026-06-01',
      paymentMethod: 'bank_transfer',
    })

    expect(result.ok).toBe(true)
    const order = (await payload.find({ collection: 'orders', limit: 1 })).docs[0]
    expect(order.deliveryAddress?.city).toBe('Brno')
  })

  it('generates sequential year-based order numbers', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)

    const cart1 = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const r1 = await placeOrder(payload, {
      user, cart: cart1, locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '' },
      deliveryMethod: 'pickup', preferredDate: '2026-06-01',
      paymentMethod: 'cash_on_delivery',
    })
    expect(r1.ok).toBe(true)
    if (!r1.ok) return

    const cart2 = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const r2 = await placeOrder(payload, {
      user, cart: cart2, locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '' },
      deliveryMethod: 'pickup', preferredDate: '2026-06-01',
      paymentMethod: 'cash_on_delivery',
    })
    expect(r2.ok).toBe(true)
    if (!r2.ok) return

    expect(parseInt(r2.orderNumber, 10)).toBe(parseInt(r1.orderNumber, 10) + 1)
  })
})
