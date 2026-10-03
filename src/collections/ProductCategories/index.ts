import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdmin, publicRead } from '../access'

export const ProductCategories: CollectionConfig = {
  slug: 'product-categories',
  access: {
    read: publicRead,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
    hidden: ({ user }) => user?.role !== 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      localized: true,
      required: true,
    },
    slugField({ sourceField: 'name' }),
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'product-categories',
      admin: {
        description: 'Nadřazená kategorie (pro podkategorie)',
      },
    },
  ],
}
