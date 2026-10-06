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
      className="underline underline-offset-4 hover:text-ground"
    >
      {t('manageButton')}
    </button>
  )
}
