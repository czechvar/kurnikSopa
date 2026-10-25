import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import {
  createTestBatch,
  createTestCart,
  createTestPickupPoint,
  createTestProduct,
  createTestUser,
  setTestSiteSettings,
} from '../../helpers/factories'
import { loginCookie, rest } from '../../helpers/rest'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

const customer = { firstName: 'Karel', lastName: 'Blokovaný', phone: '777 222 333' }

describe('a user blocked while logged in', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  async function loggedInCustomer() {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    const user = await createTestUser(payload, { email: 'karel@example.com', password: 'karel-password-1' })
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload)
    await createTestCart(payload, user, [{ product, quantity: 1 }])
    const chickens = await createTestProduct(payload, { name: 'Kuře' })
    const batch = await createTestBatch(payload, chickens)
    const cookie = await loginCookie('karel@example.com', 'karel-password-1')
    return { payload, staff, user, point, batch, cookie }
  }

  function placeBody(pickupPointId: number) {
    return { customer, pickupPointId, preferredDate: '2027-06-01', locale: 'cs' }
  }

  function bookBody(batchId: number) {
    return { batchId, quantity: 1, customer, locale: 'cs' }
  }

  it('is still signed in before the block (control)', async () => {
    const { user, cookie } = await loggedInCustomer()
    const me = await rest('GET', '/api/users/me', { cookie })
    expect(((await me.json()) as { user: { id: number } | null }).user?.id).toBe(user.id)
  })

  it('loses the session at once: the old cookie is anonymous on /api/users/me, the account pages and both order endpoints', async () => {
    const { payload, staff, user, point, batch, cookie } = await loggedInCustomer()

    await payload.update({ collection: 'users', id: user.id, data: { status: 'blocked' }, user: staff, overrideAccess: false })

    const me = await rest('GET', '/api/users/me', { cookie })
    expect(me.status).toBe(200)
    expect(((await me.json()) as { user: unknown }).user).toBeNull()

    // What every account page (src/app/(frontend)/[locale]/ucet/**) calls before rendering.
    const { user: pageUser } = await payload.auth({ headers: new Headers({ Cookie: cookie }) })
    expect(pageUser).toBeNull()

    // Anonymous: the customer's own cart is out of reach, and there is no guest cart.
    const place = await rest('POST', '/api/orders/place', { cookie, body: placeBody(point.id) })
    expect(place.status).toBe(400)
    expect(((await place.json()) as { reason: string }).reason).toBe('cartEmpty')

    // Anonymous: booking without an account needs a guest email.
    const book = await rest('POST', '/api/orders/book', { cookie, body: bookBody(batch.id) })
    expect(book.status).toBe(400)
    expect(((await book.json()) as { reason: string }).reason).toBe('guestEmailRequired')

    const orders = await payload.find({ collection: 'orders', depth: 0 })
    expect(orders.totalDocs).toBe(0)

    const login = await rest('POST', '/api/users/login', { body: { email: 'karel@example.com', password: 'karel-password-1' } })
    expect(login.status).toBe(403)
  })

  it('unblocking does not bring the old session back; logging in again works', async () => {
    const { payload, staff, user, cookie } = await loggedInCustomer()
    await payload.update({ collection: 'users', id: user.id, data: { status: 'blocked' }, user: staff, overrideAccess: false })
    await payload.update({ collection: 'users', id: user.id, data: { status: 'active' }, user: staff, overrideAccess: false })

    const stale = await rest('GET', '/api/users/me', { cookie })
    expect(((await stale.json()) as { user: unknown }).user).toBeNull()

    const fresh = await loginCookie('karel@example.com', 'karel-password-1')
    const me = await rest('GET', '/api/users/me', { cookie: fresh })
    expect(((await me.json()) as { user: { id: number } | null }).user?.id).toBe(user.id)
  })

  it('editing an active customer keeps them signed in', async () => {
    const { payload, staff, user, cookie } = await loggedInCustomer()
    await payload.update({ collection: 'users', id: user.id, data: { phone: '+420 777 999 000' }, user: staff, overrideAccess: false })
    const me = await rest('GET', '/api/users/me', { cookie })
    expect(((await me.json()) as { user: { id: number } | null }).user?.id).toBe(user.id)
  })
})
