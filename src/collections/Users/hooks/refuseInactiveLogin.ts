import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

type BeforeLoginHook = NonNullable<NonNullable<CollectionConfig['hooks']>['beforeLogin']>[number]

/**
 * Only `active` accounts log in. A requested or invited account has a random
 * password nobody knows, and a blocked one keeps its orders but loses access.
 * The message is matched client-side in `src/lib/auth/errors.ts`.
 */
export const refuseInactiveLogin: BeforeLoginHook = ({ user }: { user: { status?: string } }) => {
  const status = (user as { status?: string }).status
  if (!status || status === 'active') return user
  throw new APIError(status === 'blocked' ? 'accountBlocked' : 'accountNotActive', 403)
}
