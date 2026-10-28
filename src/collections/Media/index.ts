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
    // `filename` is the column Payload draws as a thumbnail, so the photo
    // picker shows photos rather than URLs.
    defaultColumns: ['filename', 'alt', 'createdAt'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: { cs: 'Popis fotky', en: 'Alt text' },
      localized: true,
      required: true,
      admin: {
        description: {
          cs: 'Jednou větou, co je na fotce, např. „Slepice na pastvě u kurníku“. Přečte ho čtečka lidem, kteří fotku nevidí, a pomáhá vyhledávačům.',
          en: 'One sentence on what the photo shows, e.g. “Hens grazing by the coop”. Screen readers read it to people who cannot see the photo, and it helps search engines.',
        },
      },
    },
  ],
}
