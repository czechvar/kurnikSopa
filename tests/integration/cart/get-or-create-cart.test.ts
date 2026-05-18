import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'

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
    expect((typeof cart.user === 'object' ? cart.user.id : cart.user)).toBe(user.id)
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
