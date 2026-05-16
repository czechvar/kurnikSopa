import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt', 'status'],
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
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Krátký úvodník zobrazený v přehledu článků',
      },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'post-categories',
      hasMany: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
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
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
