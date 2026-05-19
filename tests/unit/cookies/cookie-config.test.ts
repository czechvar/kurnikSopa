import { describe, expect, it, vi } from 'vitest'
import {
  buildCookieConsentConfig,
  type ConsentTranslations,
} from '@/components/cookies/cookie-config'

const sampleTranslations: ConsentTranslations = {
  consentModal: {
    title: 'T',
    description: 'D',
    acceptAllBtn: 'A',
    acceptNecessaryBtn: 'R',
    showPreferencesBtn: 'P',
    footer: '',
  },
  preferencesModal: {
    title: 'PT',
    acceptAllBtn: 'PA',
    acceptNecessaryBtn: 'PR',
    savePreferencesBtn: 'PS',
    closeIconLabel: 'X',
    sectionsIntroTitle: 'IT',
    sectionsIntroDescription: 'ID',
  },
  categories: {
    necessary: { title: 'NT', description: 'ND' },
    functional: { title: 'FT', description: 'FD' },
    analytics: { title: 'AT', description: 'AD' },
    marketing: { title: 'MT', description: 'MD' },
  },
}

describe('buildCookieConsentConfig', () => {
  it('declares all four categories with necessary as readOnly', () => {
    const cfg = buildCookieConsentConfig({
      locale: 'cs',
      translations: sampleTranslations,
      onCategoriesUpdate: () => {},
    })
    expect(cfg.categories?.necessary).toEqual({ enabled: true, readOnly: true })
    expect(cfg.categories?.functional).toBeDefined()
    expect(cfg.categories?.analytics).toBeDefined()
    expect(cfg.categories?.marketing).toBeDefined()
  })

  it('uses the requested locale as the default language', () => {
    const cfg = buildCookieConsentConfig({
      locale: 'en',
      translations: sampleTranslations,
      onCategoriesUpdate: () => {},
    })
    expect(cfg.language.default).toBe('en')
    expect(cfg.language.translations).toHaveProperty('en')
  })

  it('emits one preferences section per category plus intro', () => {
    const cfg = buildCookieConsentConfig({
      locale: 'cs',
      translations: sampleTranslations,
      onCategoriesUpdate: () => {},
    })
    const cs = cfg.language.translations.cs
    if (typeof cs !== 'object' || cs === null || 'then' in cs) {
      throw new Error('expected concrete translation object')
    }
    const sections = cs.preferencesModal?.sections ?? []
    expect(sections).toHaveLength(5)
    const linked = sections.map((s) => ('linkedCategory' in s ? s.linkedCategory : null))
    expect(linked).toEqual([null, 'necessary', 'functional', 'analytics', 'marketing'])
  })

  it('onConsent forwards granted categories to onCategoriesUpdate', () => {
    const spy = vi.fn()
    const cfg = buildCookieConsentConfig({
      locale: 'cs',
      translations: sampleTranslations,
      onCategoriesUpdate: spy,
    })
    cfg.onConsent?.({
      cookie: {
        categories: ['necessary', 'analytics'],
        revision: 0,
        data: null,
        consentId: 'x',
        consentTimestamp: new Date().toISOString(),
        lastConsentTimestamp: new Date().toISOString(),
        services: {},
        languageCode: 'cs',
        expirationTime: 0,
      },
    })
    expect(spy).toHaveBeenCalledWith(['necessary', 'analytics'])
  })

  it('onChange forwards granted categories to onCategoriesUpdate', () => {
    const spy = vi.fn()
    const cfg = buildCookieConsentConfig({
      locale: 'cs',
      translations: sampleTranslations,
      onCategoriesUpdate: spy,
    })
    cfg.onChange?.({
      cookie: {
        categories: ['marketing'],
        revision: 0,
        data: null,
        consentId: 'y',
        consentTimestamp: new Date().toISOString(),
        lastConsentTimestamp: new Date().toISOString(),
        services: {},
        languageCode: 'cs',
        expirationTime: 0,
      },
      changedCategories: ['marketing'],
      changedServices: {},
    })
    expect(spy).toHaveBeenCalledWith(['marketing'])
  })
})
