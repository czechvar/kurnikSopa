import { beforeEach, describe, expect, it } from 'vitest'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { getTestPayload } from '../../helpers/payload'
import { createTestBatch, createTestProduct, createTestUser, setTestSiteSettings } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails, capturedEmails } from '../../setup/email-spy'
import { requestAccess, sendInvitation, acceptInvitation } from '@/lib/users/invitations'
import { bookBatch } from '@/lib/orders/book'
import type { Product } from '@/payload-types'
import { rest } from '../../helpers/rest'

describe('access requests and invitations', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
    resetEmails()
  })

  it('an access request creates a requested user with an unknown password and emails requester + staff', async () => {
    const payload = await getTestPayload()
    const result = await requestAccess(payload, {
      firstName: 'Petr', lastName: 'Novák', email: 'Petr@Example.com', phone: '777 000 000',
      message: 'Bral bych kuřata v září.', locale: 'cs',
    })
    expect(result.created).toBe(true)

    const user = (await payload.find({ collection: 'users', limit: 1 })).docs[0]
    expect(user.email).toBe('petr@example.com')
    expect(user.status).toBe('requested')
    expect(user.role).toBe('customer')
    expect(user.requestMessage).toContain('kuřata')

    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails[0].to).toBe('petr@example.com')
    expect(capturedEmails[1].to).toBe('staff@kurnik-sopa.cz')
    expect(capturedEmails[1].html).toContain('Petr Novák')
    expect(capturedEmails[1].html).toContain(`/admin/collections/users/${user.id}`)

    await expect(
      payload.login({ collection: 'users', data: { email: 'petr@example.com', password: 'anything-at-all' } }),
    ).rejects.toThrow()
  })

  it('a request for an email that already exists changes nothing and sends nothing', async () => {
    const payload = await getTestPayload()
    const existing = await createTestUser(payload, { email: 'known@example.com' })
    resetEmails()
    const result = await requestAccess(payload, {
      firstName: 'X', lastName: 'Y', email: 'KNOWN@example.com', phone: '1', locale: 'cs',
    })
    expect(result.created).toBe(false)
    expect(capturedEmails).toHaveLength(0)
    const fresh = await payload.findByID({ collection: 'users', id: existing.id })
    expect(fresh.status).toBe('active')
  })

  it('an invitation marks the user invited, emails a 7-day set-password link, and accepting it activates the account', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    await requestAccess(payload, { firstName: 'Eva', lastName: 'K', email: 'eva@example.com', phone: '2', locale: 'cs' })
    const requested = (await payload.find({ collection: 'users', where: { email: { equals: 'eva@example.com' } }, limit: 1 })).docs[0]
    resetEmails()

    const sent = await sendInvitation(payload, { userId: requested.id, invitedBy: staff.id })
    expect(sent.sent).toBe(true)

    const invited = await payload.findByID({ collection: 'users', id: requested.id, depth: 0, showHiddenFields: true })
    expect(invited.status).toBe('invited')
    expect(invited.invitedAt).toBeTruthy()
    expect(invited.invitedBy).toBe(staff.id)
    const expiry = new Date((invited as unknown as { resetPasswordExpiration: string }).resetPasswordExpiration).getTime()
    expect(expiry - Date.now()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000)

    expect(capturedEmails).toHaveLength(1)
    const html = capturedEmails[0].html ?? ''
    expect(capturedEmails[0].to).toBe('eva@example.com')
    const match = html.match(/\/cs\/pozvanka\/([A-Za-z0-9]+)/)
    expect(match).not.toBeNull()
    const token = match![1]

    const accepted = await acceptInvitation(payload, { token, password: 'eva-password-123' })
    expect(accepted).toEqual({ ok: true, email: 'eva@example.com' })

    const active = await payload.findByID({ collection: 'users', id: requested.id, depth: 0 })
    expect(active.status).toBe('active')

    const login = await payload.login({ collection: 'users', data: { email: 'eva@example.com', password: 'eva-password-123' } })
    expect(login.user?.id).toBe(requested.id)
  })

  it('accepting links the earlier Guest Orders placed with that email, and nobody else\'s, without touching their prices', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    const chicken = await createTestProduct(payload, { name: 'Kuře', price: 190, unit: 'kg' })
    await payload.update({ collection: 'products', id: chicken.id, data: { soldBy: 'batch', averageWeight: 2.2 } })
    const product = (await payload.findByID({ collection: 'products', id: chicken.id, depth: 0 })) as Product
    const batch = await createTestBatch(payload, product, { capacity: 20 })
    const guest = { firstName: 'Eva', lastName: 'K', phone: '777 222 333' }

    // A web booking (stored lowercase) and a phone order typed with capitals.
    const booked = await bookBatch(payload, { user: null, guest: { email: 'eva@example.com' }, batchId: batch.id, quantity: 2, customer: guest, locale: 'cs' })
    expect(booked.ok).toBe(true)
    const phone = await payload.create({
      collection: 'orders',
      data: {
        guestName: 'Eva K', guestPhone: '777 222 333', guestEmail: 'Eva@Example.COM',
        batch: batch.id, items: [{ product: product.id, quantity: 1 }],
        totalAmount: 0, deliveryMethod: 'pickup', paymentMethod: 'cash', locale: 'cs',
      } as never,
      user: staff, overrideAccess: false,
    })
    const other = await bookBatch(payload, { user: null, guest: { email: 'neva@example.com' }, batchId: batch.id, quantity: 1, customer: guest, locale: 'cs' })
    expect(other.ok).toBe(true)
    const before = await payload.find({ collection: 'orders', sort: 'id', depth: 0, limit: 10 })

    // Weights change before Eva gets her account; her estimates must not.
    await payload.update({ collection: 'products', id: product.id, data: { averageWeight: 3 } })

    await requestAccess(payload, { firstName: 'Eva', lastName: 'K', email: 'eva@example.com', phone: '777 222 333', locale: 'cs' })
    const requested = (await payload.find({ collection: 'users', where: { email: { equals: 'eva@example.com' } }, limit: 1 })).docs[0]
    await sendInvitation(payload, { userId: requested.id, invitedBy: staff.id })
    const token = (capturedEmails.at(-1)?.html ?? '').match(/\/cs\/pozvanka\/([A-Za-z0-9]+)/)![1]
    resetEmails()

    expect(await acceptInvitation(payload, { token, password: 'eva-password-123' })).toEqual({ ok: true, email: 'eva@example.com' })

    const hers = await payload.find({ collection: 'orders', where: { customer: { equals: requested.id } }, sort: 'id', depth: 0 })
    expect(hers.docs.map(o => o.id)).toEqual([before.docs[0].id, phone.id])
    for (const order of hers.docs) {
      const was = before.docs.find(o => o.id === order.id)!
      expect(order.totalAmount).toBe(was.totalAmount)
      expect(order.guestEmail).toBe(was.guestEmail)
      expect(order.orderStatus).toBe(was.orderStatus)
    }
    const neva = (await payload.find({ collection: 'orders', where: { guestEmail: { equals: 'neva@example.com' } }, depth: 0 })).docs[0]
    expect(neva.customer ?? null).toBeNull()
    expect((await payload.findByID({ collection: 'batches', id: batch.id })).bookedCount).toBe(4)
    expect(capturedEmails).toHaveLength(0)
  })

  it('accepting with a bad token or a short password fails without changing anything', async () => {
    const payload = await getTestPayload()
    await requestAccess(payload, { firstName: 'A', lastName: 'B', email: 'ab@example.com', phone: '3', locale: 'cs' })
    expect(await acceptInvitation(payload, { token: 'nonsense', password: 'long-enough-pw' })).toEqual({ ok: false, reason: 'tokenInvalid' })
    expect(await acceptInvitation(payload, { token: 'nonsense', password: 'short' })).toEqual({ ok: false, reason: 'passwordTooShort' })
    const user = (await payload.find({ collection: 'users', where: { email: { equals: 'ab@example.com' } }, limit: 1 })).docs[0]
    expect(user.status).toBe('requested')
  })

  it('a blocked user is refused an invitation and cannot log in; unblocking restores login', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload, { email: 'blocked@example.com', password: 'blocked-password-1' })
    await payload.update({ collection: 'users', id: user.id, data: { status: 'blocked' } })

    expect(await sendInvitation(payload, { userId: user.id, invitedBy: null })).toEqual({ sent: false, reason: 'blocked' })
    await expect(
      payload.login({ collection: 'users', data: { email: 'blocked@example.com', password: 'blocked-password-1' } }),
    ).rejects.toThrow(/accountBlocked/)

    await payload.update({ collection: 'users', id: user.id, data: { status: 'active' } })
    const login = await payload.login({ collection: 'users', data: { email: 'blocked@example.com', password: 'blocked-password-1' } })
    expect(login.user?.id).toBe(user.id)
  })

  it('ticking "send invitation" in the admin sends the email and never stores the flag', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    await requestAccess(payload, { firstName: 'Tick', lastName: 'Box', email: 'tick@example.com', phone: '4', locale: 'cs' })
    const requested = (await payload.find({ collection: 'users', where: { email: { equals: 'tick@example.com' } }, limit: 1 })).docs[0]
    resetEmails()

    const saved = await payload.update({
      collection: 'users',
      id: requested.id,
      data: { sendInvitation: true },
      user: admin,
      overrideAccess: false,
    })
    expect(saved.sendInvitation).toBe(false)
    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].html).toContain('/cs/pozvanka/')
    const fresh = await payload.findByID({ collection: 'users', id: requested.id, depth: 0 })
    expect(fresh.status).toBe('invited')
    expect(fresh.sendInvitation).toBe(false)
  })
})

describe('invitation language', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
    resetEmails()
  })

  async function requestedUser(email: string) {
    const payload = await getTestPayload()
    return (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })).docs[0]
  }

  it('the access-request endpoint stores the language the form was filled in', async () => {
    const res = await rest('POST', '/api/users/request-access', {
      body: { firstName: 'Anna', lastName: 'Smith', email: 'anna@example.com', phone: '5', locale: 'en' },
    })
    expect(res.status).toBe(200)
    const user = await requestedUser('anna@example.com')
    expect(user.locale).toBe('en')
    expect(capturedEmails[0].subject).toBe('We received your request for an account')
  })

  it('a Czech requester gets a Czech invitation even when the admin works in English content', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    await requestAccess(payload, { firstName: 'Petr', lastName: 'N', email: 'petr@example.com', phone: '6', locale: 'cs' })
    const requested = await requestedUser('petr@example.com')
    expect(requested.locale).toBe('cs')
    resetEmails()

    await payload.update({
      collection: 'users',
      id: requested.id,
      data: { sendInvitation: true },
      user: admin,
      overrideAccess: false,
      locale: 'en',
    })

    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].subject).toBe('Pozvánka do Kurníku Šopa')
    expect(capturedEmails[0].html).toContain('/cs/pozvanka/')
    expect(capturedEmails[0].html).not.toContain('/en/invitation/')
  })

  it('an English requester gets an English invitation even when the admin works in Czech content', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    await requestAccess(payload, { firstName: 'Anna', lastName: 'S', email: 'anna@example.com', phone: '7', locale: 'en' })
    const requested = await requestedUser('anna@example.com')
    resetEmails()

    await payload.update({
      collection: 'users',
      id: requested.id,
      data: { sendInvitation: true },
      user: admin,
      overrideAccess: false,
      locale: 'cs',
    })

    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].subject).toBe('Your invitation to Kurník Šopa')
    expect(capturedEmails[0].html).toContain('/en/invitation/')
  })

  it('an account the admin creates by email starts Czech and can be switched before inviting', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    // No `locale` on purpose: the admin's create form leaves it at its default.
    const withoutLocale: Omit<RequiredDataFromCollectionSlug<'users'>, 'locale'> = {
      email: 'new@example.com', password: 'temporary-password-1', role: 'customer', status: 'requested',
    }
    const created = await payload.create({
      collection: 'users',
      data: withoutLocale as RequiredDataFromCollectionSlug<'users'>,
      user: admin,
      overrideAccess: false,
    })
    expect(created.locale).toBe('cs')

    resetEmails()
    await payload.update({
      collection: 'users',
      id: created.id,
      data: { locale: 'en', sendInvitation: true },
      user: admin,
      overrideAccess: false,
    })
    expect(capturedEmails[0].subject).toBe('Your invitation to Kurník Šopa')
  })
})
