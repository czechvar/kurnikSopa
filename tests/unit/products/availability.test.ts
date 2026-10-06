import { describe, expect, it } from 'vitest'
import { availabilityOf, isAvailableNow } from '@/lib/products/availability'

const base = { inStock: true, seasonal: false, availableFrom: null, availableTo: null }
const summer = { ...base, seasonal: true, availableFrom: '2026-06-01', availableTo: '2026-08-31' }

describe('availabilityOf', () => {
  it('a plain in-stock product is available', () => {
    expect(availabilityOf(base, new Date('2026-01-15'))).toEqual({ available: true })
  })

  it('out of stock wins over everything', () => {
    expect(availabilityOf({ ...summer, inStock: false }, new Date('2026-07-01'))).toEqual({ available: false, reason: 'outOfStock' })
  })

  it('seasonal: before the window is out of season', () => {
    expect(availabilityOf(summer, new Date('2026-05-31T23:00:00Z'))).toEqual({ available: false, reason: 'outOfSeason' })
  })

  it('seasonal: inside the window is available', () => {
    expect(availabilityOf(summer, new Date('2026-06-01T00:00:00Z'))).toEqual({ available: true })
    expect(availabilityOf(summer, new Date('2026-07-15'))).toEqual({ available: true })
  })

  it('seasonal: the last day counts as available until it ends', () => {
    expect(availabilityOf(summer, new Date('2026-08-31T20:00:00Z'))).toEqual({ available: true })
    expect(availabilityOf(summer, new Date('2026-09-01T00:00:00Z'))).toEqual({ available: false, reason: 'outOfSeason' })
  })

  it('seasonal without dates is treated as available', () => {
    expect(availabilityOf({ ...base, seasonal: true }, new Date('2026-01-01'))).toEqual({ available: true })
  })

  it('isAvailableNow mirrors availabilityOf', () => {
    expect(isAvailableNow(summer, new Date('2026-07-01'))).toBe(true)
    expect(isAvailableNow(summer, new Date('2026-01-01'))).toBe(false)
  })
})
