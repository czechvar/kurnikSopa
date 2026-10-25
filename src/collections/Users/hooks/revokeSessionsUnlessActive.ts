import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Only an `active` account keeps login sessions. Blocking someone therefore
 * logs them out everywhere on their next request, not when their token
 * expires: Payload's JWT check looks the token's session up on every request
 * (`auth.useSessions`, on by default), and with none left the request is
 * anonymous on the storefront pages, the REST and GraphQL APIs alike.
 *
 * `sessions` is a field nobody may write through the API; collection
 * `beforeChange` hooks run after field access control, so setting it here is
 * the supported way in, the same as Payload's own "log out everywhere".
 */
export const revokeSessionsUnlessActive: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  if (operation !== 'update') return data
  const status = data?.status ?? originalDoc?.status
  if (!status || status === 'active') return data
  return { ...data, sessions: [] }
}
