import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

/** One cart per signed-in user, and one per guest token. */
export const enforceOneCartPerUser: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const userId = typeof data.user === 'object' ? data.user?.id : data.user
  const guestToken = typeof data.guestToken === 'string' ? data.guestToken : null

  if (!userId && !guestToken) throw new APIError('cartOwnerMissing', 400)

  const existing = await req.payload.find({
    collection: 'carts',
    where: userId ? { user: { equals: userId } } : { guestToken: { equals: guestToken } },
    limit: 1,
    depth: 0,
    req,
  })

  if (existing.docs.length > 0) {
    throw new APIError('cartAlreadyExists', 409)
  }
  return data
}
