import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import {
  createTestBatch,
  createTestPickupPoint,
  createTestProduct,
  createTestUser,
  setTestSiteSettings,
} from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails, capturedEmails } from '../../setup/email-spy'
import { bookBatch, type BookInput } from '@/lib/orders/book'
import { cancelBooking, confirmBooking } from '@/lib/orders/confirm'
import { runDailyBatchJobs } from '@/lib/batches/dailyRun'
import type { Order, PickupPoint, Product, User } from '@/payload-types'

const customer = { firstName: 'Jana', lastName: 'Kuřecí', phone: '777 111 222' }

function input(user: User | null, batchId: number, quantity: number, extra: Partial<BookInput> = {}): BookInput {
  return {
    user,
    guest: user ? null : { email: 'host@example.com' },
    batchId,
    quantity,
    customer,
    locale: 'cs',
    ...extra,
  }
}

async function setup() {
  const payload = await getTestPayload()
  await setTestSiteSettings(payload)
  const point = await createTestPickupPoint(payload)
  const chicken = await createTestProduct(payload, { name: 'Kuře z pastvy', price: 190, unit: 'kg' })
  await payload.update({ collection: 'products', id: chicken.id, data: { soldBy: 'batch', averageWeight: 2.2 } })
  const product = (await payload.findByID({ collection: 'products', id: chicken.id, depth: 0 })) as Product
  resetEmails()
  return { payload, point, product }
}

const futureDay = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10)

describe('booking against a planned batch', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('creates a booked order, holds the units, estimates the price and emails customer + staff', async () => {
    const { payload, product } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    resetEmails()

    const result = await bookBatch(payload, input(user, batch.id, 3))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.orderStatus).toBe('booked')
    expect(result.orderNumber).toMatch(/^\d{10}$/)

    const order = (await payload.find({ collection: 'orders', limit: 1, depth: 0 })).docs[0] as Order
    expect(order.batch).toBe(batch.id)
    expect(order.orderStatus).toBe('booked')
    expect(order.items?.[0]?.quantity).toBe(3)
    expect(order.items?.[0]?.priceAtPurchase).toBe(190)
    expect(order.items?.[0]?.estimatedTotal).toBe(Math.round(3 * 2.2 * 190))
    expect(order.totalAmount).toBe(Math.round(3 * 2.2 * 190))
    expect(order.pickupDay).toBeFalsy()

    const fresh = await payload.findByID({ collection: 'batches', id: batch.id, depth: 0 })
    expect(fresh.bookedCount).toBe(3)

    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails[0].to).toBe(user.email)
    expect(capturedEmails[0].subject).toContain('Rezervace')
    expect(capturedEmails[0].html).toContain(`?t=${result.accessToken}`)
    expect(capturedEmails[1].to).toBe('staff@kurnik-sopa.cz')
    expect(capturedEmails[1].subject).toContain('Nová rezervace')
  })

  it('a second booking by the same person on the same batch adds to the first order', async () => {
    const { payload, product } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 10 })

    const first = await bookBatch(payload, input(user, batch.id, 2))
    const second = await bookBatch(payload, input(user, batch.id, 3))
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.merged).toBe(true)
    expect(second.orderNumber).toBe(first.orderNumber)

    const orders = await payload.find({ collection: 'orders', depth: 0 })
    expect(orders.docs).toHaveLength(1)
    expect(orders.docs[0].items?.[0]?.quantity).toBe(5)
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(5)
  })

  it('refuses more than the remaining capacity, and the batch is untouched', async () => {
    const { payload, product } = await setup()
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 5 })
    expect((await bookBatch(payload, input(a, batch.id, 4))).ok).toBe(true)
    const refused = await bookBatch(payload, input(b, batch.id, 2))
    expect(refused).toEqual({ ok: false, reason: 'batchFull' })
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(4)
    expect((await payload.find({ collection: 'orders' })).docs).toHaveLength(1)
  })

  it('two customers racing for the last units: exactly one wins', async () => {
    const { payload, product } = await setup()
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 3 })
    const [ra, rb] = await Promise.all([bookBatch(payload, input(a, batch.id, 2)), bookBatch(payload, input(b, batch.id, 2))])
    expect([ra.ok, rb.ok].filter(Boolean)).toHaveLength(1)
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(2)
    expect((await payload.find({ collection: 'orders' })).docs).toHaveLength(1)
  })

  it('a guest books with an email and reaches the order by token; a blocked account cannot book', async () => {
    const { payload, product } = await setup()
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    const guest = await bookBatch(payload, input(null, batch.id, 1))
    expect(guest.ok).toBe(true)
    const order = (await payload.find({ collection: 'orders', limit: 1, depth: 0 })).docs[0] as Order
    expect(order.guestEmail).toBe('host@example.com')
    expect(order.customer).toBeFalsy()

    const blocked = await createTestUser(payload)
    await payload.update({ collection: 'users', id: blocked.id, data: { status: 'blocked' } })
    const blockedUser = (await payload.findByID({ collection: 'users', id: blocked.id, depth: 0 })) as User
    expect(await bookBatch(payload, input(blockedUser, batch.id, 1))).toEqual({ ok: false, reason: 'accountNotActive' })
  })

  it('cancelling a booking frees its units', async () => {
    const { payload, product } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    await bookBatch(payload, input(user, batch.id, 4))
    const order = (await payload.find({ collection: 'orders', limit: 1, depth: 0 })).docs[0] as Order
    expect(await cancelBooking(payload, order)).toEqual({ ok: true })
    expect((await payload.findByID({ collection: 'orders', id: order.id })).orderStatus).toBe('cancelled')
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(0)
  })

  it('a closed batch takes no bookings', async () => {
    const { payload, product, point } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, {
      status: 'closed', capacity: 10, confirmationDeadline: futureDay(1), pickupDays: [{ date: futureDay(5), pickupPoint: point }],
    })
    expect(await bookBatch(payload, input(user, batch.id, 1))).toEqual({ ok: false, reason: 'batchNotBookable' })
  })
})

describe('opening a batch and confirming', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  async function openBatch(payload: Awaited<ReturnType<typeof getTestPayload>>, batchId: number, point: PickupPoint, deadlineDays = 7) {
    return payload.update({
      collection: 'batches',
      id: batchId,
      data: {
        status: 'open',
        confirmationDeadline: futureDay(deadlineDays),
        pickupDays: [
          { date: futureDay(deadlineDays + 3), pickupPoint: point.id },
          { date: futureDay(deadlineDays + 4), pickupPoint: point.id },
        ],
      },
    })
  }

  it('cannot be opened without dates', async () => {
    const { payload, product } = await setup()
    const batch = await createTestBatch(payload, product)
    await expect(payload.update({ collection: 'batches', id: batch.id, data: { status: 'open' } })).rejects.toThrow(/openNeedsDeadline/)
  })

  it('opening emails every booked customer, who then confirms a pickup day; quantity changes move bookedCount', async () => {
    const { payload, product, point } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    await bookBatch(payload, input(user, batch.id, 3))
    await bookBatch(payload, input(null, batch.id, 2))
    resetEmails()

    const opened = await openBatch(payload, batch.id, point)
    expect(opened.status).toBe('open')
    expect(opened.openedAt).toBeTruthy()
    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails.map(e => e.to).sort()).toEqual([user.email, 'host@example.com'].sort())
    expect(capturedEmails[0].subject).toContain('potvrďte do')
    resetEmails()

    const order = (await payload.find({ collection: 'orders', where: { customer: { equals: user.id } }, limit: 1, depth: 1 })).docs[0] as Order
    const result = await confirmBooking(payload, { order, pickupDayIndex: 1, quantity: 5 })
    expect(result).toEqual({ ok: true, orderStatus: 'confirmed' })

    const confirmed = (await payload.findByID({ collection: 'orders', id: order.id, depth: 0 })) as Order
    expect(confirmed.orderStatus).toBe('confirmed')
    expect(confirmed.pickupPoint).toBe(point.id)
    expect(confirmed.pickupDay?.slice(0, 10)).toBe(futureDay(11))
    expect(confirmed.confirmedAt).toBeTruthy()
    expect(confirmed.items?.[0]?.quantity).toBe(5)
    expect(confirmed.totalAmount).toBe(Math.round(5 * 2.2 * 190))
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(7)

    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].subject).toContain('potvrzena')
  })

  it('confirming more than what is left is refused', async () => {
    const { payload, product, point } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 4 })
    await bookBatch(payload, input(user, batch.id, 2))
    await bookBatch(payload, input(null, batch.id, 2))
    await openBatch(payload, batch.id, point)
    const order = (await payload.find({ collection: 'orders', where: { customer: { equals: user.id } }, limit: 1, depth: 1 })).docs[0] as Order
    expect(await confirmBooking(payload, { order, pickupDayIndex: 0, quantity: 3 })).toEqual({ ok: false, reason: 'batchFull' })
    expect((await payload.findByID({ collection: 'orders', id: order.id })).orderStatus).toBe('booked')
  })

  it('a new booking on an open batch is confirmed straight away with the chosen day', async () => {
    const { payload, product, point } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    await openBatch(payload, batch.id, point)
    expect(await bookBatch(payload, input(user, batch.id, 2))).toEqual({ ok: false, reason: 'pickupDayRequired' })
    const result = await bookBatch(payload, input(user, batch.id, 2, { pickupDayIndex: 0 }))
    expect(result.ok && result.orderStatus).toBe('confirmed')
    const order = (await payload.find({ collection: 'orders', limit: 1, depth: 0 })).docs[0] as Order
    expect(order.pickupDay?.slice(0, 10)).toBe(futureDay(10))
    expect(order.pickupPoint).toBe(point.id)
  })

  it('a phone order typed in by staff gets a number, prices and counts against the batch', async () => {
    const { payload, product } = await setup()
    const staff = await createTestUser(payload, { role: 'staff' })
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    const order = await payload.create({
      collection: 'orders',
      data: {
        guestName: 'Pan Novák',
        guestPhone: '777 000 000',
        batch: batch.id,
        items: [{ product: product.id, quantity: 2 }],
        totalAmount: 0,
        deliveryMethod: 'pickup',
        paymentMethod: 'cash',
        locale: 'cs',
      } as never,
      user: staff,
      overrideAccess: false,
    })
    expect(order.orderNumber).toMatch(/^\d{10}$/)
    expect(order.accessToken).toBeTruthy()
    expect(order.orderStatus).toBe('booked')
    expect(order.items?.[0]?.priceAtPurchase).toBe(190)
    expect(order.totalAmount).toBe(Math.round(2 * 2.2 * 190))
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(2)
    expect(capturedEmails).toHaveLength(0)
  })
})

describe('daily batch jobs', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('reminds within three days of the deadline exactly once, then releases and closes after it', async () => {
    const { payload, product, point } = await setup()
    const user = await createTestUser(payload)
    const batch = await createTestBatch(payload, product, { capacity: 10 })
    await bookBatch(payload, input(user, batch.id, 2))
    await bookBatch(payload, input(null, batch.id, 1))
    await payload.update({
      collection: 'batches', id: batch.id,
      data: { status: 'open', confirmationDeadline: '2027-08-20', pickupDays: [{ date: '2027-08-28', pickupPoint: point.id }] },
    })
    // The guest confirms; the account holder forgets.
    const guestOrder = (await payload.find({ collection: 'orders', where: { guestEmail: { equals: 'host@example.com' } }, limit: 1, depth: 1 })).docs[0] as Order
    await confirmBooking(payload, { order: guestOrder, pickupDayIndex: 0 })
    resetEmails()

    const early = await runDailyBatchJobs(payload, new Date('2027-08-10T05:00:00Z'))
    expect(early).toEqual({ reminders: 0, released: 0, closed: 0 })

    const reminding = await runDailyBatchJobs(payload, new Date('2027-08-18T05:00:00Z'))
    expect(reminding).toEqual({ reminders: 1, released: 0, closed: 0 })
    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].to).toBe(user.email)
    expect(capturedEmails[0].subject).toContain('Připomínka')

    const again = await runDailyBatchJobs(payload, new Date('2027-08-19T05:00:00Z'))
    expect(again).toEqual({ reminders: 0, released: 0, closed: 0 })
    resetEmails()

    const after = await runDailyBatchJobs(payload, new Date('2027-08-21T05:00:00Z'))
    expect(after).toEqual({ reminders: 0, released: 1, closed: 1 })
    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].subject).toContain('uvolněna')

    const released = (await payload.find({ collection: 'orders', where: { customer: { equals: user.id } }, limit: 1, depth: 0 })).docs[0] as Order
    expect(released.orderStatus).toBe('released')
    expect(released.releasedAt).toBeTruthy()
    const closed = await payload.findByID({ collection: 'batches', id: batch.id })
    expect(closed.status).toBe('closed')
    expect(closed.bookedCount).toBe(1)

    const idempotent = await runDailyBatchJobs(payload, new Date('2027-08-22T05:00:00Z'))
    expect(idempotent).toEqual({ reminders: 0, released: 0, closed: 0 })
  })
})
