import type { CollectionConfig, Access, Where } from 'payload'
import { guestTokenFromCookieHeader } from '@/lib/cart/guestToken'
import { enforceOneCartPerUser } from './hooks/enforceOneCartPerUser'
import { pinCartOwner } from './hooks/pinCartOwner'
import { validateCartItems } from './hooks/validateCartItems'
import { addItemEndpoint } from './endpoints/addItem'

/**
 * A cart is visible to its owner: the signed-in user it belongs to, or the
 * anonymous visitor whose cookie carries its guest token.
 */
const ownerOrStaff =
  (staffAllowed: boolean): Access =>
  ({ req }): Where | boolean => {
    if (req.user) {
      if (req.user.role === 'admin') return true
      if (req.user.role === 'staff') return staffAllowed
      return { user: { equals: req.user.id } }
    }
    const token = guestTokenFromCookieHeader(req.headers.get('cookie'))
    return token ? { guestToken: { equals: token } } : false
  }

const canCreate: Access = ({ req }) => {
  if (req.user) return true
  return Boolean(guestTokenFromCookieHeader(req.headers.get('cookie')))
}

export const Carts: CollectionConfig = {
  slug: 'carts',
  labels: {
    singular: { cs: 'Košík', en: 'Cart' },
    plural: { cs: 'Košíky', en: 'Carts' },
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'guestToken', 'updatedAt'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
  },
  access: {
    create: canCreate,
    read: ownerOrStaff(true),
    update: ownerOrStaff(false),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  endpoints: [addItemEndpoint],
  hooks: {
    beforeChange: [pinCartOwner, enforceOneCartPerUser, validateCartItems],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      index: true,
      label: { cs: 'Uživatel', en: 'User' },
    },
    {
      name: 'guestToken',
      type: 'text',
      index: true,
      label: { cs: 'Token hosta', en: 'Guest token' },
      admin: {
        readOnly: true,
        description: { cs: 'Košík nepřihlášeného návštěvníka (podle cookie).', en: 'Cart of an anonymous visitor (by cookie).' },
      },
    },
    {
      name: 'items',
      type: 'array',
      label: { cs: 'Položky', en: 'Items' },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
      ],
    },
  ],
}
