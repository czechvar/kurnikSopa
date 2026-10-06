import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdmin, publishedOrStaffRead } from '../access'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: { cs: 'Produkt', en: 'Product' },
    plural: { cs: 'Produkty', en: 'Products' },
  },
  access: {
    read: publishedOrStaffRead,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'inStock', 'status'],
    hidden: ({ user }) => user?.role !== 'admin',
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
      // How the product is sold. `unit` products go through the cart and are
      // bought now; `batch` products are booked against a Batch ("turnus"),
      // ordered by the piece and priced by weight at pickup.
      name: 'soldBy',
      type: 'select',
      required: true,
      defaultValue: 'unit',
      label: { cs: 'Způsob prodeje', en: 'Sold by' },
      options: [
        { label: { cs: 'Běžný nákup (vejce, zelenina)', en: 'Buy now (eggs, vegetables)' }, value: 'unit' },
        { label: { cs: 'Rezervace na turnus (kuřata, husy, králíci)', en: 'Booking against a batch (chickens, geese, rabbits)' }, value: 'batch' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      admin: { condition: (data) => data?.soldBy === 'batch' },
      fields: [
        {
          name: 'averageWeight',
          type: 'number',
          min: 0,
          label: { cs: 'Průměrná váha kusu (kg)', en: 'Average weight per piece (kg)' },
          admin: { description: { cs: 'Pro odhad ceny: cena/kg × průměrná váha.', en: 'For the price estimate: price/kg × average weight.' } },
        },
        {
          name: 'weightRange',
          type: 'text',
          label: { cs: 'Rozpětí váhy', en: 'Weight range' },
          admin: { description: { cs: 'Např. „1,6–3 kg“.', en: 'E.g. “1.6–3 kg”.' } },
        },
      ],
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
  ],
}
