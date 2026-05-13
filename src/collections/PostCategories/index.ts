import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

export const PostCategories: CollectionConfig = {
  slug: 'post-categories',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
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
  ],
}
