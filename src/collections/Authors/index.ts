import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

export const Authors: CollectionConfig = {
  slug: 'authors',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({ sourceField: 'name' }),
    {
      name: 'role',
      type: 'text',
      localized: true,
      admin: {
        description: 'Např. „farmář", „redaktorka"',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
