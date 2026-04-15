'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher'

export function Header() {
  const t = useTranslations('nav')

  return (
    <header className="sticky top-0 z-50 bg-brand-green text-brand-cream">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-heading text-2xl">
          Kurník & Šopa
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/produkty" className="hover:text-brand-cream/80 transition-colors">
            {t('products')}
          </Link>
          <Link href="/akce" className="hover:text-brand-cream/80 transition-colors">
            {t('events')}
          </Link>
          <Link href="/o-nas" className="hover:text-brand-cream/80 transition-colors">
            {t('about')}
          </Link>
          <Link href="/kontakt" className="hover:text-brand-cream/80 transition-colors">
            {t('contact')}
          </Link>
          <Link href="/blog" className="hover:text-brand-cream/80 transition-colors">
            {t('blog')}
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link
            href="/kosik"
            className="bg-brand-cream text-brand-green px-4 py-2 rounded-lg font-semibold hover:bg-brand-cream-dark transition-colors"
          >
            {t('cart')}
          </Link>
        </div>
      </div>
    </header>
  )
}
