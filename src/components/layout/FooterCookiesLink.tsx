'use client'

import { useTranslations } from 'next-intl'

export function FooterCookiesLink() {
  const t = useTranslations('cookieConsent')

  const handleClick = () => {
    void import('vanilla-cookieconsent').then((CC) => {
      CC.showPreferences()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="underline hover:text-brand-cream transition-colors"
    >
      {t('manageButton')}
    </button>
  )
}
