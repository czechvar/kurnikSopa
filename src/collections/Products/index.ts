import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'inStock', 'status'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Cena v CZK',
      },
    },
    {
      name: 'unit',
      type: 'select',
      options: [
        { label: 'kg', value: 'kg' },
        { label: 'ks (kus)', value: 'ks' },
        { label: 'l (litr)', value: 'l' },
        { label: 'balení', value: 'baleni' },
      ],
    },
    {
      name: 'weight',
      type: 'number',
      admin: {
        description: 'Váha v gramech (pro výpočet dopravy)',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'product-categories',
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'inStock',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stockQuantity',
      type: 'number',
      min: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'seasonal',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'availableFrom',
      type: 'date',
      admin: {
        condition: (data) => data.seasonal,
      },
    },
    {
      name: 'availableTo',
      type: 'date',
      admin: {
        condition: (data) => data.seasonal,
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'minimumOrder',
      type: 'number',
      min: 1,
      admin: {
        description: 'Minimální počet kusů k objednání',
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
    {
      name: 'stripeProductID',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
