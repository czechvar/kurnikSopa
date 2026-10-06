import type { CollectionConfig } from 'payload'
import { isAdminOrEditor, publicRead } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { cs: 'Obrázek', en: 'Image' },
    plural: { cs: 'Obrázky', en: 'Media' },
  },
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 576,
        position: 'centre',
      },
      {
        name: 'hero',
        width: 2200,
        height: 1000,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: { quality: 80 },
        },
      },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
  },
  admin: {
    useAsTitle: 'alt',
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      required: true,
    },
  ],
}
