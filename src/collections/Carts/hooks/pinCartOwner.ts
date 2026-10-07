import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'
import { guestTokenFromCookieHeader } from '@/lib/cart/guestToken'

/**
 * A cart belongs to whoever created it, full stop.
 *
 * Over REST/GraphQL a signed-in customer's cart is pinned to their own id and
 * an anonymous visitor's cart to the guest token in their cookie, whatever the
 * body says. Admin and the Local API (server code, seeds, tests) are trusted.
 */
export const pinCartOwner: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (req.payloadAPI === 'local') return data
  if (req.user?.role === 'admin') return data

  if (req.user) {
    if (operation === 'create' || data.user !== undefined || data.guestToken !== undefined) {
      return { ...data, user: req.user.id, guestToken: null }
    }
    return data
  }

  const token = guestTokenFromCookieHeader(req.headers.get('cookie'))
  if (!token) throw new APIError('guestTokenMissing', 401)
  if (operation === 'create' || data.user !== undefined || data.guestToken !== undefined) {
    return { ...data, user: null, guestToken: token }
  }
  return data
}
