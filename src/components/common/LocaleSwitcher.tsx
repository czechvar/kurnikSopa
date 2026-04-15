'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/lib/i18n/routing'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = () => {
    const newLocale = locale === 'cs' ? 'en' : 'cs'
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <button
      onClick={switchLocale}
      className="text-sm font-medium hover:text-brand-cream/80 transition-colors uppercase"
      aria-label={locale === 'cs' ? 'Switch to English' : 'Přepnout do češtiny'}
    >
      {locale === 'cs' ? 'EN' : 'CZ'}
    </button>
  )
}
