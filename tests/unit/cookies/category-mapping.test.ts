import { describe, expect, it } from 'vitest'
import {
  defaultDeniedConsent,
  mapCategoriesToGtmConsent,
} from '@/components/cookies/cookie-categories'

describe('mapCategoriesToGtmConsent', () => {
  it('denies everything except security when no categories granted', () => {
    const consent = mapCategoriesToGtmConsent([])
    expect(consent.security_storage).toBe('granted')
    expect(consent.functionality_storage).toBe('denied')
    expect(consent.personalization_storage).toBe('denied')
    expect(consent.analytics_storage).toBe('denied')
    expect(consent.ad_storage).toBe('denied')
    expect(consent.ad_user_data).toBe('denied')
    expect(consent.ad_personalization).toBe('denied')
  })

  it('grants analytics_storage when analytics is in granted list', () => {
    const consent = mapCategoriesToGtmConsent(['analytics'])
    expect(consent.analytics_storage).toBe('granted')
    expect(consent.ad_storage).toBe('denied')
    expect(consent.functionality_storage).toBe('denied')
  })

  it('grants all marketing-related signals when marketing is granted', () => {
    const consent = mapCategoriesToGtmConsent(['marketing'])
    expect(consent.ad_storage).toBe('granted')
    expect(consent.ad_user_data).toBe('granted')
    expect(consent.ad_personalization).toBe('granted')
    expect(consent.analytics_storage).toBe('denied')
  })

  it('grants functionality + personalization when functional is granted', () => {
    const consent = mapCategoriesToGtmConsent(['functional'])
    expect(consent.functionality_storage).toBe('granted')
    expect(consent.personalization_storage).toBe('granted')
    expect(consent.analytics_storage).toBe('denied')
  })

  it('grants everything when all categories are granted', () => {
    const consent = mapCategoriesToGtmConsent([
      'necessary',
      'functional',
      'analytics',
      'marketing',
    ])
    expect(consent).toEqual({
      security_storage: 'granted',
      functionality_storage: 'granted',
      personalization_storage: 'granted',
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  })

  it('necessary alone does not grant any non-security signal', () => {
    const consent = mapCategoriesToGtmConsent(['necessary'])
    expect(consent.security_storage).toBe('granted')
    expect(consent.analytics_storage).toBe('denied')
    expect(consent.ad_storage).toBe('denied')
    expect(consent.functionality_storage).toBe('denied')
  })

  it('defaultDeniedConsent matches mapCategoriesToGtmConsent([])', () => {
    expect(defaultDeniedConsent()).toEqual(mapCategoriesToGtmConsent([]))
  })
})
