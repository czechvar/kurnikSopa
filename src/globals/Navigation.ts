import type { GlobalConfig } from 'payload'
import { isAdmin, publicRead } from '../collections/access'

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  access: {
    read: publicRead,
    update: isAdmin,
  },
  label: { cs: 'Navigace', en: 'Navigation' },
  admin: {
    hidden: ({ user }) => user?.role !== 'admin',
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'newTab',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'children',
          type: 'array',
          fields: [
            {
              name: 'label',
              type: 'text',
              localized: true,
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
  ],
}
