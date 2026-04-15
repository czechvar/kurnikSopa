import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { Users } from '@/collections/Users'
import { Media } from '@/collections/Media'
import { Products } from '@/collections/Products'
import { ProductCategories } from '@/collections/ProductCategories'
import { Events } from '@/collections/Events'
import { EventRegistrations } from '@/collections/EventRegistrations'
import { Orders } from '@/collections/Orders'
import { Pages } from '@/collections/Pages'

import { SiteSettings } from '@/globals/SiteSettings'
import { Navigation } from '@/globals/Navigation'
import { Footer } from '@/globals/Footer'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  collections: [
    Users,
    Media,
    Products,
    ProductCategories,
    Events,
    EventRegistrations,
    Orders,
    Pages,
  ],

  globals: [
    SiteSettings,
    Navigation,
    Footer,
  ],

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),

  localization: {
    locales: [
      {
        label: 'Čeština',
        code: 'cs',
      },
      {
        label: 'English',
        code: 'en',
      },
    ],
    defaultLocale: 'cs',
    fallback: true,
  },

  sharp,
})
