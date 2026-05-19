import type { GtmConsentParams } from './cookie-categories'

export function pushGtagConsentUpdate(params: GtmConsentParams): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(['consent', 'update', params])
}
