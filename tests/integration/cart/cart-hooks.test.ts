import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, createTestProduct, createTestCart, createTestGuestCart } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

const TOKEN = 'guest-token-abcdefghijklmnop'

describe('Carts hooks', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('refuses a line below the product minimum order on create and on update', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const eggs = await createTestProduct(payload, { minimumOrder: 20 })

    await expect(createTestCart(payload, user, [{ product: eggs, quantity: 2 }])).rejects.toThrow(/belowMinimumOrder/)

    const cart = await createTestCart(payload, user, [{ product: eggs, quantity: 20 }])
    await expect(
      payload.update({ collection: 'carts', id: cart.id, data: { items: [{ product: eggs.id, quantity: 19 }] } }),
    ).rejects.toThrow(/belowMinimumOrder/)

    const unchanged = await payload.findByID({ collection: 'carts', id: cart.id, depth: 0 })
    expect(unchanged.items?.[0]?.quantity).toBe(20)
  })

  it('refuses a cart line for a product that does not exist', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.create({ collection: 'carts', data: { guestToken: TOKEN, items: [{ product: 99999, quantity: 1 }] } }),
    ).rejects.toThrow()
  })

  it('allows one cart per guest token and one per user', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    await createTestGuestCart(payload, TOKEN, [{ product, quantity: 1 }])
    await expect(createTestGuestCart(payload, TOKEN, [{ product, quantity: 1 }])).rejects.toThrow(/cartAlreadyExists/)

    const user = await createTestUser(payload)
    await createTestCart(payload, user, [{ product, quantity: 1 }])
    await expect(createTestCart(payload, user, [{ product, quantity: 1 }])).rejects.toThrow(/cartAlreadyExists/)

    const all = await payload.find({ collection: 'carts', limit: 10 })
    expect(all.docs).toHaveLength(2)
  })

  it('refuses a cart with neither user nor guest token', async () => {
    const payload = await getTestPayload()
    await expect(payload.create({ collection: 'carts', data: { items: [] } })).rejects.toThrow(/cartOwnerMissing/)
  })
})
