import type { Access } from 'payload'

/** Admins only. Catalogue and site structure. */
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

/** Admins and editors. Editorial content the farm maintains itself. */
export const isAdminOrEditor: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'editor'

/** Admins and staff. Orders, pickups and the people who place them. */
export const isAdminOrStaff: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

/**
 * Anyone, signed in or not. Explicit because Payload's default for an
 * unspecified operation is "any authenticated user", which is wrong in both
 * directions for public catalogue content.
 */
export const publicRead: Access = () => true

/**
 * Anyone may read published documents; admin and staff also see drafts.
 * For collections whose publish state is a plain `status` select rather than
 * Payload drafts, so `/api/<slug>` does not leak unpublished records.
 */
export const publishedOrStaffRead: Access = ({ req }) => {
  if (req.user?.role === 'admin' || req.user?.role === 'staff') return true
  return { status: { equals: 'published' } }
}
