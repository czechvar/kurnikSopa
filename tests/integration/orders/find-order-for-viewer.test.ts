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
import { resetEmails } from '../../setup/email-spy'
import { placeOrder } from '@/lib/orders/placeOrder'
import { findOrderForViewer } from '@/lib/orders/findOrderForViewer'

/**
 * The thank-you page used to look orders up by their sequential number with
 * access bypassed, so any logged-in user could read anyone's order. This is
 * the rule that replaced it.
 */
describe('findOrderForViewer', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  async function placeFor(userOrNull: Awaited<ReturnType<typeof createTestUser>> | null) {
    const payload = await getTestPayload()
    const point = await createTestPickupPoint(payload)
    const product = await createTestProduct(payload)
    const cart = userOrNull
      ? await createTestCart(payload, userOrNull, [{ product, quantity: 1 }])
      : await createTestGuestCart(payload, 'guest-token-abcdefghijklmnop', [{ product, quantity: 1 }])
    const result = await placeOrder(payload, {
      user: userOrNull,
      guest: userOrNull ? null : { email: 'host@example.com' },
      cart,
      locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '1' },
      pickupPointId: point.id,
      preferredDate: '2026-06-01',
    })
    if (!result.ok) throw new Error('placeOrder failed in test setup')
    return result
  }

  it('the owner sees their order without a token', async () => {
    const payload = await getTestPayload()
    const owner = await createTestUser(payload)
    const { orderNumber } = await placeFor(owner)
    const order = await findOrderForViewer(payload, { orderNumber, user: owner, token: null })
    expect(order?.orderNumber).toBe(orderNumber)
  })

  it('another logged-in user gets nothing, even with the right order number', async () => {
    const payload = await getTestPayload()
    const owner = await createTestUser(payload)
    const other = await createTestUser(payload)
    const { orderNumber } = await placeFor(owner)
    expect(await findOrderForViewer(payload, { orderNumber, user: other, token: null })).toBeNull()
  })

  it('an anonymous visitor gets nothing without a token', async () => {
    const payload = await getTestPayload()
    const { orderNumber } = await placeFor(null)
    expect(await findOrderForViewer(payload, { orderNumber, user: null, token: null })).toBeNull()
  })

  it('the access token from the email opens the order for anyone holding it', async () => {
    const payload = await getTestPayload()
    const { orderNumber, accessToken } = await placeFor(null)
    const order = await findOrderForViewer(payload, { orderNumber, user: null, token: accessToken })
    expect(order?.orderNumber).toBe(orderNumber)
  })

  it('a wrong token gets nothing', async () => {
    const payload = await getTestPayload()
    const { orderNumber, accessToken } = await placeFor(null)
    const wrong = accessToken.slice(0, -1) + (accessToken.endsWith('a') ? 'b' : 'a')
    expect(await findOrderForViewer(payload, { orderNumber, user: null, token: wrong })).toBeNull()
    expect(await findOrderForViewer(payload, { orderNumber, user: null, token: '' })).toBeNull()
  })

  it('staff and admin see every order', async () => {
    const payload = await getTestPayload()
    const owner = await createTestUser(payload)
    const staff = await createTestUser(payload, { role: 'staff' })
    const admin = await createTestUser(payload, { role: 'admin' })
    const { orderNumber } = await placeFor(owner)
    expect((await findOrderForViewer(payload, { orderNumber, user: staff, token: null }))?.orderNumber).toBe(orderNumber)
    expect((await findOrderForViewer(payload, { orderNumber, user: admin, token: null }))?.orderNumber).toBe(orderNumber)
  })

  it('an unknown order number is null for everyone', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    expect(await findOrderForViewer(payload, { orderNumber: '2026999999', user: admin, token: null })).toBeNull()
  })
})
