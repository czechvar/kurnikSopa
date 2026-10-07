import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, createTestProduct, createTestCart, createTestGuestCart } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import { getOrCreateCart, resolveCart, mergeCartItems } from '@/lib/cart/getOrCreateCart'

const TOKEN = 'guest-token-abcdefghijklmnop'

describe('getOrCreateCart', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('creates a cart on first call for a user', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const cart = await getOrCreateCart(payload, user.id as number)
    expect(cart.id).toBeDefined()
    expect(cart.user && (typeof cart.user === 'object' ? cart.user.id : cart.user)).toBe(user.id)
  })

  it('returns the same cart on subsequent calls (idempotent)', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const first = await getOrCreateCart(payload, user.id as number)
    const second = await getOrCreateCart(payload, user.id as number)
    expect(second.id).toBe(first.id)
  })

  it('returns different carts for different users', async () => {
    const payload = await getTestPayload()
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    const cartA = await getOrCreateCart(payload, a.id as number)
    const cartB = await getOrCreateCart(payload, b.id as number)
    expect(cartA.id).not.toBe(cartB.id)
  })
})

describe('resolveCart', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('is null for a guest with no cart, and does not create one', async () => {
    const payload = await getTestPayload()
    expect(await resolveCart(payload, { user: null, guestToken: TOKEN })).toBeNull()
    expect(await resolveCart(payload, { user: null, guestToken: null })).toBeNull()
    const all = await payload.find({ collection: 'carts', limit: 10 })
    expect(all.docs).toHaveLength(0)
  })

  it('returns the guest cart for its token', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const guestCart = await createTestGuestCart(payload, TOKEN, [{ product, quantity: 2 }])
    const found = await resolveCart(payload, { user: null, guestToken: TOKEN })
    expect(found?.id).toBe(guestCart.id)
    expect(await resolveCart(payload, { user: null, guestToken: 'another-token-0123456789' })).toBeNull()
  })

  it('merges a guest cart into the user cart on login and deletes the guest cart', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const eggs = await createTestProduct(payload)
    const honey = await createTestProduct(payload)
    await createTestCart(payload, user, [{ product: eggs, quantity: 1 }])
    await createTestGuestCart(payload, TOKEN, [{ product: eggs, quantity: 2 }, { product: honey, quantity: 1 }])

    const merged = await resolveCart(payload, { user, guestToken: TOKEN })
    const items = (merged?.items ?? []).map(it => ({
      product: typeof it.product === 'object' ? it.product.id : it.product,
      quantity: it.quantity,
    }))
    expect(items).toEqual(expect.arrayContaining([
      { product: eggs.id, quantity: 3 },
      { product: honey.id, quantity: 1 },
    ]))
    expect(items).toHaveLength(2)

    const all = await payload.find({ collection: 'carts', limit: 10, depth: 0 })
    expect(all.docs).toHaveLength(1)
    expect(all.docs[0].user).toBe(user.id)
  })
})

describe('mergeCartItems', () => {
  it('adds quantities per product and keeps new products', () => {
    const out = mergeCartItems(
      [{ product: 1, quantity: 1 }, { product: 2, quantity: 5 }],
      [{ product: 1, quantity: 2 }, { product: 3, quantity: 1 }],
    )
    expect(out).toEqual([
      { product: 1, quantity: 3 },
      { product: 2, quantity: 5 },
      { product: 3, quantity: 1 },
    ])
  })
})
