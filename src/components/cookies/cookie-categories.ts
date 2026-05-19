export type CategoryKey = 'necessary' | 'functional' | 'analytics' | 'marketing'

export const ALL_CATEGORIES: readonly CategoryKey[] = [
  'necessary',
  'functional',
  'analytics',
  'marketing',
] as const

export type GtmConsentState = 'granted' | 'denied'

export type GtmConsentParams = {
  security_storage: GtmConsentState
  functionality_storage: GtmConsentState
  personalization_storage: GtmConsentState
  analytics_storage: GtmConsentState
  ad_storage: GtmConsentState
  ad_user_data: GtmConsentState
  ad_personalization: GtmConsentState
}

export function mapCategoriesToGtmConsent(granted: readonly CategoryKey[]): GtmConsentParams {
  const has = (k: CategoryKey) => granted.includes(k)
  const yn = (b: boolean): GtmConsentState => (b ? 'granted' : 'denied')

  return {
    security_storage: 'granted',
    functionality_storage: yn(has('functional')),
    personalization_storage: yn(has('functional')),
    analytics_storage: yn(has('analytics')),
    ad_storage: yn(has('marketing')),
    ad_user_data: yn(has('marketing')),
    ad_personalization: yn(has('marketing')),
  }
}

export function defaultDeniedConsent(): GtmConsentParams {
  return mapCategoriesToGtmConsent([])
}
