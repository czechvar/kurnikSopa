import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
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
    hidden: ({ user }) => user?.role !== 'admin',
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
