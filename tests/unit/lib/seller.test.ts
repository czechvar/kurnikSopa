import { describe, expect, it } from 'vitest'
import { sellerIdentity } from '@/lib/legal/seller'

const base = {
  farmName: 'Kurník & Šopa',
  owner: 'Antonín Wies',
  address: { street: 'Č.p. 313', city: 'Křepice u Hustopečí', zip: '691 65' },
  contact: { email: 'info@kurnik-sopa.cz', phone: '774801667' },
  legal: {
    ico: ' 12345678 ',
    dic: '',
    registration: 'zemědělský podnikatel',
    effectiveFrom: '2026-11-01T12:00:00.000Z',
  },
}

describe('sellerIdentity', () => {
  it('prints the seller from Site Settings in Czech formats', () => {
    expect(sellerIdentity(base, 'cs')).toEqual({
      name: 'Antonín Wies – Kurník & Šopa',
      address: 'Č.p. 313, 691 65 Křepice u Hustopečí',
      ico: '12345678',
      dic: null,
      registration: 'zemědělský podnikatel',
      email: 'info@kurnik-sopa.cz',
      phone: '+420 774 801 667',
      effectiveFrom: '1. listopadu 2026',
    })
  })

  it('formats the date in English and reads it in Prague time', () => {
    // 23:30 UTC on 31 October is already 1 November in Prague.
    const late = { ...base, legal: { ...base.legal, effectiveFrom: '2026-10-31T23:30:00.000Z' } }
    expect(sellerIdentity(late, 'en').effectiveFrom).toBe('1 November 2026')
  })

  it('returns null for everything the farm has not filled in', () => {
    const empty = { farmName: 'Kurník & Šopa', owner: null, address: {}, contact: {}, legal: {} }
    expect(sellerIdentity(empty, 'cs')).toEqual({
      name: 'Kurník & Šopa',
      address: null,
      ico: null,
      dic: null,
      registration: null,
      email: null,
      phone: null,
      effectiveFrom: null,
    })
  })
})
