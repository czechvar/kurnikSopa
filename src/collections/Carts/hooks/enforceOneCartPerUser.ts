import type { CollectionBeforeChangeHook } from 'payload'

export const enforceOneCartPerUser: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const userId = typeof data.user === 'object' ? data.user?.id : data.user
  if (!userId) return data

  const existing = await req.payload.find({
    collection: 'carts',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
  })

  if (existing.docs.length > 0) {
    throw new Error('Cart for this user already exists')
  }
  return data
}
