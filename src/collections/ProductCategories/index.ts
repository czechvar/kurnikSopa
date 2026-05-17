import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

export const ProductCategories: CollectionConfig = {
  slug: 'product-categories',
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
