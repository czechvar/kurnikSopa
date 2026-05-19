import type { CookieConsentConfig } from 'vanilla-cookieconsent'
import type { CategoryKey } from './cookie-categories'

export type ConsentTranslations = {
  consentModal: {
    title: string
    description: string
    acceptAllBtn: string
    acceptNecessaryBtn: string
    showPreferencesBtn: string
    footer: string
  }
  preferencesModal: {
    title: string
    acceptAllBtn: string
    acceptNecessaryBtn: string
    savePreferencesBtn: string
    closeIconLabel: string
    sectionsIntroTitle: string
    sectionsIntroDescription: string
  }
  categories: Record<CategoryKey, { title: string; description: string }>
}

export type BuildConfigArgs = {
  locale: 'cs' | 'en'
  translations: ConsentTranslations
  onCategoriesUpdate: (granted: CategoryKey[]) => void
}

export function buildCookieConsentConfig({
  locale,
  translations,
  onCategoriesUpdate,
}: BuildConfigArgs): CookieConsentConfig {
  return {
    guiOptions: {
      consentModal: {
        layout: 'box inline',
        position: 'bottom left',
        equalWeightButtons: false,
        flipButtons: false,
      },
      preferencesModal: {
        layout: 'box',
        equalWeightButtons: false,
        flipButtons: false,
      },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      functional: {},
      analytics: {},
      marketing: {},
    },
    language: {
      default: locale,
      translations: {
        [locale]: {
          consentModal: {
            title: translations.consentModal.title,
            description: translations.consentModal.description,
            acceptAllBtn: translations.consentModal.acceptAllBtn,
            acceptNecessaryBtn: translations.consentModal.acceptNecessaryBtn,
            showPreferencesBtn: translations.consentModal.showPreferencesBtn,
            footer: translations.consentModal.footer,
          },
          preferencesModal: {
            title: translations.preferencesModal.title,
            acceptAllBtn: translations.preferencesModal.acceptAllBtn,
            acceptNecessaryBtn: translations.preferencesModal.acceptNecessaryBtn,
            savePreferencesBtn: translations.preferencesModal.savePreferencesBtn,
            closeIconLabel: translations.preferencesModal.closeIconLabel,
            sections: [
              {
                title: translations.preferencesModal.sectionsIntroTitle,
                description: translations.preferencesModal.sectionsIntroDescription,
              },
              {
                title: translations.categories.necessary.title,
                description: translations.categories.necessary.description,
                linkedCategory: 'necessary',
              },
              {
                title: translations.categories.functional.title,
                description: translations.categories.functional.description,
                linkedCategory: 'functional',
              },
              {
                title: translations.categories.analytics.title,
                description: translations.categories.analytics.description,
                linkedCategory: 'analytics',
              },
              {
                title: translations.categories.marketing.title,
                description: translations.categories.marketing.description,
                linkedCategory: 'marketing',
              },
            ],
          },
        },
      },
    },
    onConsent: ({ cookie }) => {
      const granted = (cookie.categories ?? []) as CategoryKey[]
      onCategoriesUpdate(granted)
    },
    onChange: ({ cookie }) => {
      const granted = (cookie.categories ?? []) as CategoryKey[]
      onCategoriesUpdate(granted)
    },
  }
}
