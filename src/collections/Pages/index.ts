import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdmin, publicRead } from '../access'

export const ABOUT_PAGE_SLUG = 'o-nas'

const isAboutPage = (data: Partial<{ slug?: string | null }> | undefined): boolean =>
  data?.slug === ABOUT_PAGE_SLUG

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
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: { cs: 'Úvodní fotka', en: 'Cover photo' },
      admin: {
        // Only the About page renders its photos (src/app/(frontend)/[locale]/o-nas).
        condition: isAboutPage,
        description: {
          cs: 'Široká fotka pod nadpisem stránky. Co má zůstat vidět, nastavíte bodem zájmu v detailu fotky (Obrázky).',
          en: 'Wide photo under the page heading. Set what must stay in view with the focal point on the photo (Media).',
        },
      },
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      maxRows: 12,
      label: { cs: 'Galerie', en: 'Gallery' },
      admin: {
        condition: isAboutPage,
        description: {
          cs: 'Fotky pod textem stránky, nejlépe po třech (3, 6, 9…). Pořadí změníte přetažením.',
          en: 'Photos under the page text, ideally in threes (3, 6, 9…). Drag to reorder.',
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
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
