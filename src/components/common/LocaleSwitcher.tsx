'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/lib/i18n/routing'

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = () => {
    const newLocale = locale === 'cs' ? 'en' : 'cs'
    // Cast needed because usePathname() may return dynamic routes like /produkty/[slug]
    router.replace(pathname as '/', { locale: newLocale })
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      className={`text-sm font-semibold uppercase tracking-wide underline-offset-4 hover:underline ${className}`}
      aria-label={locale === 'cs' ? 'Switch to English' : 'Přepnout do češtiny'}
    >
      <span aria-hidden="true">
        <span className={locale === 'cs' ? 'font-extrabold' : 'opacity-70'}>CS</span>
        {' / '}
        <span className={locale === 'en' ? 'font-extrabold' : 'opacity-70'}>EN</span>
      </span>
    </button>
  )
}
