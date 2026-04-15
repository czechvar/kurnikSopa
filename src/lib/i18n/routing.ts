import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['cs', 'en'],
  defaultLocale: 'cs',
  pathnames: {
    '/': '/',
    '/produkty': {
      cs: '/produkty',
      en: '/products',
    },
    '/produkty/[slug]': {
      cs: '/produkty/[slug]',
      en: '/products/[slug]',
    },
    '/akce': {
      cs: '/akce',
      en: '/events',
    },
    '/akce/[slug]': {
      cs: '/akce/[slug]',
      en: '/events/[slug]',
    },
    '/kosik': {
      cs: '/kosik',
      en: '/cart',
    },
    '/pokladna': {
      cs: '/pokladna',
      en: '/checkout',
    },
    '/o-nas': {
      cs: '/o-nas',
      en: '/about',
    },
    '/kontakt': {
      cs: '/kontakt',
      en: '/contact',
    },
    '/blog': {
      cs: '/blog',
      en: '/blog',
    },
  },
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
