import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdminOrEditor, publicRead } from '../access'

export const PostCategories: CollectionConfig = {
  slug: 'post-categories',
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  admin: {
    useAsTitle: 'name',
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
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
