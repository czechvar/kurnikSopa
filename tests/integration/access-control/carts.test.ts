import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, createTestProduct, createTestCart } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('Carts access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a user can read their own cart', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const user = await createTestUser(payload)
    await createTestCart(payload, user, [{ product, quantity: 1 }])

    const result = await payload.find({
      collection: 'carts',
      user,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(1)
  })

  it('a user cannot read another user’s cart', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    await createTestCart(payload, b, [{ product, quantity: 1 }])

    const result = await payload.find({
      collection: 'carts',
      user: a,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(0)
  })

  it('one row per user is enforced (second create either returns existing or errors)', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const user = await createTestUser(payload)
    await createTestCart(payload, user, [{ product, quantity: 1 }])

    // Attempt a second create. Behavior may be reject or upsert depending on Carts hooks;
    // either way, row count must stay at 1.
    try {
      await createTestCart(payload, user, [{ product, quantity: 2 }])
    } catch { /* acceptable */ }

    const all = await payload.find({ collection: 'carts', limit: 10 })
    expect(all.docs).toHaveLength(1)
  })
})
