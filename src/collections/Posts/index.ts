import type { Access, CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdminOrEditor } from '../access'
import { publishedPostsWhere } from '@/lib/posts/queries'
import { fillPublishedAt } from './hooks/fillPublishedAt'

/**
 * Admins and editors read everything. Everyone else — signed in or not — gets
 * posts that are published and due, so neither a draft nor a scheduled post
 * can be fetched through `/api/posts` ahead of time.
 */
const readPublishedOrEditorial: Access = (args) => {
  if (isAdminOrEditor(args)) return true
  return publishedPostsWhere()
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: { cs: 'Článek', en: 'Post' },
    plural: { cs: 'Články', en: 'Posts' },
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [fillPublishedAt],
  },
  access: {
    read: readPublishedOrEditorial,
    // Unpublished edits live only in the versions table. Without this, Payload
    // lets any signed-in user read them.
    readVersions: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt', '_status'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
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
  ],
}
