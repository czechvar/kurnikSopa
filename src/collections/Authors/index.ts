import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdminOrEditor, publicRead } from '../access'

export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: {
    singular: { cs: 'Autor', en: 'Author' },
    plural: { cs: 'Autoři', en: 'Authors' },
  },
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
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
