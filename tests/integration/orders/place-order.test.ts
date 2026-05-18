import { beforeEach, describe, expect, it } from 'vitest'
import { Client } from 'pg'
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

/** Raw SQL helper — bypasses Payload validation for test setup edge cases. */
async function rawQuery(sql: string): Promise<void> {
  const uri = process.env.DATABASE_URI
  if (!uri) throw new Error('DATABASE_URI not set')
  const c = new Client({ connectionString: uri })
  await c.connect()
  try {
    await c.query(sql)
  } finally {
    await c.end()
  }
}

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

describe('placeOrder — validation rejections', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  const baseInput = (overrides: Record<string, unknown> = {}) => ({
    locale: 'cs' as const,
    customer: { firstName: 'A', lastName: 'B', phone: '+420123456789' },
    deliveryMethod: 'pickup' as const,
    preferredDate: '2026-06-01',
    paymentMethod: 'cash_on_delivery' as const,
    ...overrides,
  })

  it('rejects an empty cart with reason cartEmpty', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const cart = await createTestCart(payload, user, [])
    resetEmails() // clear the user verification email triggered by createTestUser
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('cartEmpty')
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })

  it('rejects when product is not found', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    // Craft a cart in-memory with a non-existent product ID (99999).
    // placeOrder uses input.cart.items directly without re-fetching from DB,
    // so we never persist this cart — avoiding FK constraint issues.
    resetEmails()
    const fakeCart = {
      id: 99999,
      user: user.id,
      items: [{ product: 99999 /* non-existent product ID — DB identity sequence is reset to 1 in beforeEach */, quantity: 1 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as import('@/payload-types').Cart

    const result = await placeOrder(payload, { user, cart: fakeCart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('productNotFound')
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })

  it('rejects out-of-stock product', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { inStock: false })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('outOfStock')
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })

  it('rejects insufficient stock', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { stockQuantity: 2 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 5 }])
    resetEmails()
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('insufficientStock')
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })

  it('rejects below minimum order with min populated', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { minimumOrder: 5 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 2 }])
    resetEmails()
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('belowMinimumOrder')
    expect(result.errors[0].min).toBe(5)
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })

  it('rejects seasonal product outside its window', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, {
      seasonal: true,
      availableFrom: '2020-01-01',
      availableTo:   '2020-12-31',
    })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('outOfSeason')
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })

  it('rejects bank_transfer when SiteSettings.payment.accountNumber is missing', async () => {
    const payload = await getTestPayload()
    // setTestSiteSettings (called in beforeEach) initialises the site_settings row.
    // We then blank out the required payment columns via raw SQL to bypass
    // Payload's `required: true` validation (which rejects empty strings).
    await rawQuery(
      `UPDATE site_settings SET payment_account_number = '', payment_bank_code = ''`,
    )

    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, {
      user, cart,
      ...baseInput({ paymentMethod: 'bank_transfer' }),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('paymentMethodMissingBankDetails')
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  })
})
