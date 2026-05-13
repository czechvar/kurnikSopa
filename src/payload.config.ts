import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Users } from '@/collections/Users'
import { Media } from '@/collections/Media'
import { Products } from '@/collections/Products'
import { ProductCategories } from '@/collections/ProductCategories'
import { Events } from '@/collections/Events'
import { EventRegistrations } from '@/collections/EventRegistrations'
import { Orders } from '@/collections/Orders'
import { Pages } from '@/collections/Pages'
import { Posts } from '@/collections/Posts'
import { PostCategories } from '@/collections/PostCategories'
import { Authors } from '@/collections/Authors'

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
    Posts,
    PostCategories,
    Authors,
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

  plugins: [
    s3Storage({
      collections: {
        media: { prefix: 'media' },
      },
      bucket: process.env.S3_BUCKET || '',
      clientUploads: true,
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'auto',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: true,
      },
    }),
  ],

  sharp,
})
