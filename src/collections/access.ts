import type { Access } from 'payload'

/** Admins only. Catalogue and site structure. */
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

/** Admins and editors. Editorial content the farm maintains itself. */
export const isAdminOrEditor: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'editor'

/**
 * Anyone, signed in or not. Explicit because Payload's default for an
 * unspecified operation is "any authenticated user", which is wrong in both
 * directions for public catalogue content.
 */
export const publicRead: Access = () => true
