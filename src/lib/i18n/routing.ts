import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['cs', 'en'],
  defaultLocale: 'cs',
  localeDetection: false,
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
    '/blog/[slug]': {
      cs: '/blog/[slug]',
      en: '/blog/[slug]',
    },
    '/registrace': {
      cs: '/registrace',
      en: '/register',
    },
    '/prihlaseni': {
      cs: '/prihlaseni',
      en: '/login',
    },
    '/zapomenute-heslo': {
      cs: '/zapomenute-heslo',
      en: '/forgot-password',
    },
    '/obnova-hesla/[token]': {
      cs: '/obnova-hesla/[token]',
      en: '/reset-password/[token]',
    },
    '/overeni-emailu/[token]': {
      cs: '/overeni-emailu/[token]',
      en: '/verify-email/[token]',
    },
    '/ucet': {
      cs: '/ucet',
      en: '/account',
    },
  },
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
