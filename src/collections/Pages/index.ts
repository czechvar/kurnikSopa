import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdmin, publicRead } from '../access'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: { cs: 'Stránka', en: 'Page' },
    plural: { cs: 'Stránky', en: 'Pages' },
  },
  access: {
    read: publicRead,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'title',
    hidden: ({ user }) => user?.role !== 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    slugField({ sourceField: 'title' }),
    {
      name: 'content',
      type: 'richText',
      localized: true,
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text', localized: true },
        { name: 'metaDescription', type: 'textarea', localized: true },
        { name: 'metaImage', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Koncept', value: 'draft' },
        { label: 'Publikováno', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
