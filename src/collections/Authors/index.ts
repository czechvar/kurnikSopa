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
      label: { cs: 'Jméno', en: 'Name' },
      required: true,
      admin: {
        description: {
          cs: 'Jak se autor podepisuje pod článkem, např. „Jana Nováková“ nebo „Farma Kurník & Šopa“.',
          en: 'How the author signs their posts, e.g. “Jana Nováková” or “Kurník & Šopa farm”.',
        },
      },
    },
    slugField({ sourceField: 'name' }),
    {
      name: 'role',
      type: 'text',
      label: { cs: 'Role', en: 'Role' },
      localized: true,
      admin: {
        description: { cs: 'Např. „farmář“, „redaktorka“.', en: 'E.g. “farmer”, “editor”.' },
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: { cs: 'Krátce o autorovi', en: 'Bio' },
      localized: true,
    },
    {
      name: 'avatar',
      type: 'upload',
      label: { cs: 'Fotka autora', en: 'Avatar' },
      relationTo: 'media',
      admin: {
        description: {
          cs: 'Malá fotka vedle jména pod nadpisem článku. Nepovinné.',
          en: 'A small photo next to the name under the post title. Optional.',
        },
      },
    },
  ],
}
