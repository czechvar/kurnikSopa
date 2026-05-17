import type { CollectionConfig, Access } from 'payload'
import { enforceOneCartPerUser } from './hooks/enforceOneCartPerUser'

const isAdminOrStaffOrOwner: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin' || req.user.role === 'staff') return true
  return { user: { equals: req.user.id } }
}

const ownerOnlyUpdate: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return { user: { equals: req.user.id } }
}

export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'updatedAt'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: isAdminOrStaffOrOwner,
    update: ownerOnlyUpdate,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [enforceOneCartPerUser],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'items',
      type: 'array',
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
