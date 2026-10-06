import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import {
  createTestUser,
  createTestProduct,
  createTestCart,
  createTestGuestCart,
  createTestPickupPoint,
  setTestSiteSettings,
} from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails, capturedEmails } from '../../setup/email-spy'
import { placeOrder, type PlaceOrderInput } from '@/lib/orders/placeOrder'
import type { PickupPoint, User, Cart } from '@/payload-types'

const customer = { firstName: 'Jan', lastName: 'Novák', phone: '+420123456789' }

function inputFor(user: User | null, cart: Cart, point: PickupPoint, overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    user,
    guest: user ? null : { email: 'host@example.com' },
    cart,
    locale: 'cs',
    customer,
    pickupPointId: point.id,
    preferredDate: '2026-06-01',
    ...overrides,
  }
}

describe('placeOrder — happy paths', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  it('places a cash order for a signed-in customer: snapshots prices, stores the pickup point, emails customer + staff, clears the cart', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, { price: 250 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 3 }])
    resetEmails() // drop the verification email from createTestUser

    const result = await placeOrder(payload, inputFor(user, cart, point))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.orderNumber).toMatch(/^2026\d{6}$/)
    expect(result.accessToken).toMatch(/^[A-Za-z0-9_-]{20,}$/)

    const orders = await payload.find({ collection: 'orders', limit: 1, depth: 0 })
    expect(orders.docs).toHaveLength(1)
    const order = orders.docs[0]
    expect(order.totalAmount).toBe(750)
    expect(order.items?.[0]?.priceAtPurchase).toBe(250)
    expect(order.paymentMethod).toBe('cash')
    expect(order.paymentStatus).toBe('unpaid')
    expect(order.deliveryMethod).toBe('pickup')
    expect(order.pickupPoint).toBe(point.id)
    expect(order.customer).toBe(user.id)
    expect(order.guestEmail).toBeFalsy()
    expect(order.accessToken).toBe(result.accessToken)

    const carts = await payload.find({ collection: 'carts', limit: 1 })
    expect(carts.docs).toHaveLength(0)

    expect(capturedEmails).toHaveLength(2)
    const [confirmation, staff] = capturedEmails
    expect(confirmation.to).toBe(user.email)
    expect(confirmation.subject).toContain(result.orderNumber)
    expect(confirmation.html).toContain(`?t=${result.accessToken}`)
    expect(confirmation.html).toContain('hotově')
    expect(confirmation.html).toContain('Farma Křepice')
    expect(confirmation.attachments).toBeFalsy()
    expect(staff.to).toBe('staff@kurnik-sopa.cz')
    expect(staff.html).toContain('Farma Křepice')
  })

  it('places a guest order with name, phone and email on the order and no customer', async () => {
    const payload = await getTestPayload()
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, { price: 9, minimumOrder: 20 })
    const cart = await createTestGuestCart(payload, 'guest-token-abcdefghijklmnop', [{ product, quantity: 20 }])

    const result = await placeOrder(payload, inputFor(null, cart, point, { guest: { email: 'host@example.com' } }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const order = (await payload.find({ collection: 'orders', limit: 1, depth: 0 })).docs[0]
    expect(order.customer).toBeFalsy()
    expect(order.guestEmail).toBe('host@example.com')
    expect(order.guestName).toBe('Jan Novák')
    expect(order.guestPhone).toBe('+420123456789')
    expect(order.totalAmount).toBe(180)

    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails[0].to).toBe('host@example.com')
    expect(capturedEmails[0].html).toContain(`?t=${result.accessToken}`)
    expect(capturedEmails[1].html).toContain('bez účtu')

    const carts = await payload.find({ collection: 'carts', limit: 1 })
    expect(carts.docs).toHaveLength(0)
  })

  it('generates sequential year-based order numbers', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload)

    const cart1 = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const r1 = await placeOrder(payload, inputFor(user, cart1, point))
    expect(r1.ok).toBe(true)
    if (!r1.ok) return

    const cart2 = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const r2 = await placeOrder(payload, inputFor(user, cart2, point))
    expect(r2.ok).toBe(true)
    if (!r2.ok) return

    expect(parseInt(r2.orderNumber, 10)).toBe(parseInt(r1.orderNumber, 10) + 1)
    expect(r2.accessToken).not.toBe(r1.accessToken)
  })
})

describe('placeOrder — rejections', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  async function expectNoOrderAndNoEmail() {
    const payload = await getTestPayload()
    expect(capturedEmails).toHaveLength(0)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(0)
  }

  it('rejects an empty cart with reason cartEmpty', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const cart = await createTestCart(payload, user, [])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('cartEmpty')
    await expectNoOrderAndNoEmail()
  })

  it('rejects a guest without an email', async () => {
    const payload = await getTestPayload()
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestGuestCart(payload, 'guest-token-abcdefghijklmnop', [{ product, quantity: 1 }])
    const result = await placeOrder(payload, inputFor(null, cart, point, { guest: null }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('guestEmailRequired')
    await expectNoOrderAndNoEmail()
  })

  it('rejects an inactive pickup point', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload, { active: false })
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('pickupPointInvalid')
    await expectNoOrderAndNoEmail()
  })

  it('rejects a pickup point that does not exist', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point, { pickupPointId: 99999 }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('pickupPointInvalid')
    await expectNoOrderAndNoEmail()
  })

  it('rejects when product is not found', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    resetEmails()
    const fakeCart = {
      id: 99999,
      user: user.id,
      items: [{ product: 99999, quantity: 1 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Cart

    const result = await placeOrder(payload, inputFor(user, fakeCart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('productNotFound')
    await expectNoOrderAndNoEmail()
  })

  it('rejects a draft product as not found', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, { status: 'draft' })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('productNotFound')
    await expectNoOrderAndNoEmail()
  })

  it('rejects out-of-stock product', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, { inStock: false })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('outOfStock')
    await expectNoOrderAndNoEmail()
  })

  it('rejects insufficient stock', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, { stockQuantity: 2 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 5 }])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('insufficientStock')
    await expectNoOrderAndNoEmail()
  })

  it('rejects below minimum order with min populated', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, { minimumOrder: 5 })
    // The cart hook refuses a below-minimum line, so write the cart with the hook's check in mind:
    // create at the minimum, then lower the product's minimum… no — simply raise the minimum after.
    const cart = await createTestCart(payload, user, [{ product, quantity: 5 }])
    await payload.update({ collection: 'products', id: product.id, data: { minimumOrder: 10 } })
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('belowMinimumOrder')
    expect(result.errors[0].min).toBe(10)
    await expectNoOrderAndNoEmail()
  })

  it('rejects seasonal product outside its window', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload, {
      seasonal: true,
      availableFrom: '2020-01-01',
      availableTo:   '2020-12-31',
    })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    resetEmails()
    const result = await placeOrder(payload, inputFor(user, cart, point))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('outOfSeason')
    await expectNoOrderAndNoEmail()
  })
})
