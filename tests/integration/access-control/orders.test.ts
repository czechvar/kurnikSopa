import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, createTestProduct } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import type { Order, Product, User } from '@/payload-types'

let orderCounter = 0

async function seedOrder(
  opts: { customer: User; product: Product; orderNumber?: string },
): Promise<Order> {
  orderCounter += 1
  const payload = await getTestPayload()
  return payload.create({
    collection: 'orders',
    data: {
      orderNumber: opts.orderNumber ?? `20260000${String(orderCounter).padStart(2, '0')}`,
      customer: opts.customer.id,
      items: [{ product: opts.product.id, quantity: 1, priceAtPurchase: opts.product.price }],
      totalAmount: opts.product.price,
      deliveryMethod: 'pickup',
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      orderStatus: 'received',
      preferredDate: '2026-06-01',
      locale: 'cs',
    } as any,
  })
}

describe('Orders access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    orderCounter = 0
  })

  it('a customer can read only their own orders', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customerA = await createTestUser(payload)
    const customerB = await createTestUser(payload)
    await seedOrder({ customer: customerA, product })
    await seedOrder({ customer: customerB, product })

    const result = await payload.find({
      collection: 'orders',
      user: customerA,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(1)
    const customer = result.docs[0].customer
    const ownerId =
      typeof customer === 'object' && customer !== null
        ? customer.id
        : customer
    expect(ownerId).toBe(customerA.id)
  })

  // The collection-level update access is `isAdminOrStaff` — customers are denied
  // at the collection level, not just the field level. Payload throws an error
  // (Forbidden) when collection-level access returns false.
  it('a customer cannot update an order at all', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customer = await createTestUser(payload)
    const order = await seedOrder({ customer, product })

    await expect(
      payload.update({
        collection: 'orders',
        id: order.id,
        data: { paymentStatus: 'paid' } as any,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a staff user can update paymentStatus, orderStatus, notes — and only those', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customer = await createTestUser(payload)
    const staff = await createTestUser(payload, { role: 'staff' })
    const order = await seedOrder({ customer, product })

    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        paymentStatus: 'paid',
        orderStatus: 'shipped',
        notes: 'picked up',
      } as any,
      user: staff,
      overrideAccess: false,
    })
    expect(updated.paymentStatus).toBe('paid')
    expect(updated.orderStatus).toBe('shipped')

    // Staff attempting to change totalAmount — field access is adminOnly,
    // so Payload silently strips it; the value must remain unchanged.
    const sameOrder = await seedOrder({ customer, product })
    const tryTotal = await payload.update({
      collection: 'orders',
      id: sameOrder.id,
      data: { totalAmount: 0 } as any,
      user: staff,
      overrideAccess: false,
    })
    expect(tryTotal.totalAmount).toBe(sameOrder.totalAmount)
  })

  it('an admin can update any field', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customer = await createTestUser(payload)
    const admin = await createTestUser(payload, { role: 'admin' })
    const order = await seedOrder({ customer, product })

    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: { totalAmount: 999 } as any,
      user: admin,
      overrideAccess: false,
    })
    expect(updated.totalAmount).toBe(999)
  })
})
