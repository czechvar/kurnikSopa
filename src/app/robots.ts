import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const PRODUCTION_HOSTS = new Set(['kurnik-sopa.cz', 'www.kurnik-sopa.cz'])

export default function robots(): MetadataRoute.Robots {
  const host = new URL(SITE_URL).hostname
  if (!PRODUCTION_HOSTS.has(host)) {
    // Dev / preview / Vercel-temporary URLs: keep them out of search indexes.
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
