import type { Payload } from 'payload'
import type { Cart } from '@/payload-types'

export async function getOrCreateCart(payload: Payload, userId: number | string): Promise<Cart> {
  const found = await payload.find({
    collection: 'carts',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 2,
  })
  if (found.docs[0]) return found.docs[0]

  return payload.create({
    collection: 'carts',
    data: { user: userId as number, items: [] },
    depth: 2,
  })
}
