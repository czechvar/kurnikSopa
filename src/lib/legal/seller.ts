import type { SiteSetting } from '@/payload-types'
import { formatPhone } from '@/lib/utils'

/**
 * Who sells, as the legal pages print it. Every value comes from Site
 * Settings; a value the farm has not filled in yet is null, and the page shows
 * a visible "fill this in" marker instead of leaving the line out.
 */
export type SellerIdentity = {
  name: string | null
  address: string | null
  ico: string | null
  dic: string | null
  registration: string | null
  email: string | null
  phone: string | null
  /** Formatted for the page locale, e.g. "1. listopadu 2026". */
  effectiveFrom: string | null
}

type SellerSettings = Pick<SiteSetting, 'farmName' | 'owner' | 'address' | 'contact' | 'legal'>

const filled = (v: string | null | undefined): string | null => {
  const t = v?.trim()
  return t ? t : null
}

export function sellerIdentity(settings: SellerSettings, locale: 'cs' | 'en'): SellerIdentity {
  const owner = filled(settings.owner)
  const farm = filled(settings.farmName)
  const street = filled(settings.address?.street)
  const town = filled([settings.address?.zip, settings.address?.city].filter(Boolean).join(' '))
  const phone = filled(settings.contact?.phone)
  const date = settings.legal?.effectiveFrom

  return {
    name: owner && farm ? `${owner} – ${farm}` : owner ?? farm,
    address: [street, town].filter(Boolean).join(', ') || null,
    ico: filled(settings.legal?.ico),
    dic: filled(settings.legal?.dic),
    registration: filled(settings.legal?.registration),
    email: filled(settings.contact?.email),
    phone: phone ? formatPhone(phone) : null,
    effectiveFrom: date
      ? new Date(date).toLocaleDateString(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/Prague',
        })
      : null,
  }
}
