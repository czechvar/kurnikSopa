import type { Payload } from 'payload'
import type { Cart, User } from '@/payload-types'

type CartItems = NonNullable<Cart['items']>

function productIdOf(item: CartItems[number]): number {
  return (typeof item.product === 'object' ? item.product.id : item.product) as number
}

/** Merge two item lists, adding quantities for the same product. */
export function mergeCartItems(base: CartItems, extra: CartItems): Array<{ product: number; quantity: number }> {
  const out = new Map<number, number>()
  for (const it of base) out.set(productIdOf(it), (out.get(productIdOf(it)) ?? 0) + it.quantity)
  for (const it of extra) out.set(productIdOf(it), (out.get(productIdOf(it)) ?? 0) + it.quantity)
  return [...out.entries()].map(([product, quantity]) => ({ product, quantity }))
}

/** The signed-in user's cart, created empty if they have none. */
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

/** The guest cart for a token, or null. Guest carts are created lazily by the add endpoint. */
export async function findGuestCart(payload: Payload, guestToken: string): Promise<Cart | null> {
  const found = await payload.find({
    collection: 'carts',
    where: { guestToken: { equals: guestToken } },
    limit: 1,
    depth: 2,
  })
  return found.docs[0] ?? null
}

/**
 * The cart for whoever is browsing: the signed-in user's cart, or the guest
 * cart behind the cookie token, or null when a guest has not added anything.
 *
 * When a visitor logs in with a guest cart in the cookie, its items move into
 * the user's cart and the guest cart is deleted, so nothing is lost at login.
 */
export async function resolveCart(
  payload: Payload,
  viewer: { user: User | null; guestToken: string | null },
): Promise<Cart | null> {
  const { user, guestToken } = viewer

  if (!user) {
    return guestToken ? findGuestCart(payload, guestToken) : null
  }

  const userCart = await getOrCreateCart(payload, user.id)
  if (!guestToken) return userCart

  const guestCart = await findGuestCart(payload, guestToken)
  if (!guestCart) return userCart

  const merged = mergeCartItems(userCart.items ?? [], guestCart.items ?? [])
  const updated = await payload.update({
    collection: 'carts',
    id: userCart.id,
    data: { items: merged },
    depth: 2,
  })
  try {
    await payload.delete({ collection: 'carts', id: guestCart.id })
  } catch (e) {
    payload.logger.warn(`Failed to delete merged guest cart ${guestCart.id}: ${String(e)}`)
  }
  return updated
}
