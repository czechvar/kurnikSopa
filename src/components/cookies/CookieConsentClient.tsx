'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import 'vanilla-cookieconsent/dist/cookieconsent.css'
import './cookieconsent-overrides.css'
import { buildCookieConsentConfig, type ConsentTranslations } from './cookie-config'
import type { CategoryKey } from './cookie-categories'
import { mapCategoriesToGtmConsent } from './cookie-categories'
import { pushGtagConsentUpdate } from './gtag'

type Props = {
  locale: 'cs' | 'en'
}

export function CookieConsentClient({ locale }: Props) {
  const t = useTranslations('cookieConsent')

  const translations = useMemo<ConsentTranslations>(
    () => ({
      consentModal: {
        title: t('consentModal.title'),
        description: t.raw('consentModal.description') as string,
        acceptAllBtn: t('consentModal.acceptAllBtn'),
        acceptNecessaryBtn: t('consentModal.acceptNecessaryBtn'),
        showPreferencesBtn: t('consentModal.showPreferencesBtn'),
        footer: t('consentModal.footer'),
      },
      preferencesModal: {
        title: t('preferencesModal.title'),
        acceptAllBtn: t('preferencesModal.acceptAllBtn'),
        acceptNecessaryBtn: t('preferencesModal.acceptNecessaryBtn'),
        savePreferencesBtn: t('preferencesModal.savePreferencesBtn'),
        closeIconLabel: t('preferencesModal.closeIconLabel'),
        sectionsIntroTitle: t('preferencesModal.sectionsIntroTitle'),
        sectionsIntroDescription: t('preferencesModal.sectionsIntroDescription'),
      },
      categories: {
        necessary: {
          title: t('categories.necessary.title'),
          description: t('categories.necessary.description'),
        },
        functional: {
          title: t('categories.functional.title'),
          description: t('categories.functional.description'),
        },
        analytics: {
          title: t('categories.analytics.title'),
          description: t('categories.analytics.description'),
        },
        marketing: {
          title: t('categories.marketing.title'),
          description: t('categories.marketing.description'),
        },
      },
    }),
    [t],
  )

  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let cancelled = false
    void import('vanilla-cookieconsent').then((CC) => {
      if (cancelled) return
      const config = buildCookieConsentConfig({
        locale,
        translations,
        onCategoriesUpdate: (granted: CategoryKey[]) => {
          pushGtagConsentUpdate(mapCategoriesToGtmConsent(granted))
        },
      })
      void CC.run(config)
    })
    return () => {
      cancelled = true
    }
  }, [locale, translations])

  return null
}
