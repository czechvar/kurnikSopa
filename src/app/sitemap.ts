import type { MetadataRoute } from 'next'
import { getPayload } from '@/lib/payload'
import { SITE_URL } from '@/lib/site'

type Locale = 'cs' | 'en'
const LOCALES: Locale[] = ['cs', 'en']

// Static route paths (without locale prefix), with per-locale pathname mapping
// mirroring src/lib/i18n/routing.ts so the sitemap stays consistent if you
// localize a slug.
const STATIC_PATHS: Array<{ cs: string; en: string; priority: number }> = [
  { cs: '/', en: '/', priority: 1.0 },
  { cs: '/produkty', en: '/products', priority: 0.9 },
  { cs: '/akce', en: '/events', priority: 0.8 },
  { cs: '/blog', en: '/blog', priority: 0.8 },
  { cs: '/o-nas', en: '/about', priority: 0.5 },
  { cs: '/kontakt', en: '/contact', priority: 0.5 },
]

function url(locale: Locale, path: string): string {
  const normalized = path === '/' ? '' : path
  return `${SITE_URL}/${locale}${normalized}`
}

function alternates(getPath: (locale: Locale) => string) {
  return {
    languages: Object.fromEntries(
      LOCALES.map((l) => [l, getPath(l)]),
    ) as Record<Locale, string>,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload()

  const entries: MetadataRoute.Sitemap = []

  // Static pages, one entry per locale
  for (const route of STATIC_PATHS) {
    for (const locale of LOCALES) {
      const path = route[locale]
      entries.push({
        url: url(locale, path),
        changeFrequency: 'weekly',
        priority: route.priority,
        alternates: alternates((l) => url(l, route[l])),
      })
    }
  }

  // Products
  const products = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    limit: 1000,
    depth: 0,
    pagination: false,
  })
  for (const product of products.docs) {
    if (!product.slug) continue
    for (const locale of LOCALES) {
      const segment = locale === 'cs' ? 'produkty' : 'products'
      entries.push({
        url: `${SITE_URL}/${locale}/${segment}/${product.slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: alternates((l) => {
          const seg = l === 'cs' ? 'produkty' : 'products'
          return `${SITE_URL}/${l}/${seg}/${product.slug}`
        }),
      })
    }
  }

  // Events
  const events = await payload.find({
    collection: 'events',
    where: { status: { in: ['upcoming', 'full'] } },
    limit: 1000,
    depth: 0,
    pagination: false,
  })
  for (const event of events.docs) {
    if (!event.slug) continue
    for (const locale of LOCALES) {
      const segment = locale === 'cs' ? 'akce' : 'events'
      entries.push({
        url: `${SITE_URL}/${locale}/${segment}/${event.slug}`,
        lastModified: event.updatedAt ? new Date(event.updatedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: alternates((l) => {
          const seg = l === 'cs' ? 'akce' : 'events'
          return `${SITE_URL}/${l}/${seg}/${event.slug}`
        }),
      })
    }
  }

  // Blog posts
  const posts = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    limit: 1000,
    depth: 0,
    pagination: false,
  })
  for (const post of posts.docs) {
    if (!post.slug) continue
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: alternates((l) => `${SITE_URL}/${l}/blog/${post.slug}`),
      })
    }
  }

  return entries
}
