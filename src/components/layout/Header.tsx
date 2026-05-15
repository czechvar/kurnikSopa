'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'
import type { ReactNode } from 'react'

export function Header({ userMenu }: { userMenu?: ReactNode }) {
  const t = useTranslations('nav')

  return (
    <header className="sticky top-0 z-50 bg-brand-green/95 backdrop-blur text-brand-cream">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="Kurník & Šopa">
          <Image
            src="/logo-kurnik-sopa.svg"
            alt="Kurník & Šopa"
            width={140}
            height={64}
            priority
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/produkty" className="hover:text-brand-cream/70 transition-colors">{t('products')}</Link>
          <Link href="/akce" className="hover:text-brand-cream/70 transition-colors">{t('events')}</Link>
          <Link href="/o-nas" className="hover:text-brand-cream/70 transition-colors">{t('about')}</Link>
          <Link href="/kontakt" className="hover:text-brand-cream/70 transition-colors">{t('contact')}</Link>
          <Link href="/blog" className="hover:text-brand-cream/70 transition-colors">{t('blog')}</Link>
        </nav>

        <div className="flex items-center gap-4">
          {userMenu}
          <Link
            href="/kosik"
            className="bg-brand-cream text-brand-green-deep px-4 py-2 rounded-lg font-semibold hover:bg-brand-cream-dark transition-colors"
          >
            {t('cart')}
          </Link>
        </div>
      </div>
    </header>
  )
}
