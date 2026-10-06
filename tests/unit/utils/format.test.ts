import { describe, expect, it } from 'vitest'
import { formatPrice } from '@/lib/utils'

describe('formatPrice', () => {
  it('formats Czech crowns with grouped thousands: 1 250 Kč', () => {
    expect(formatPrice(1250)).toBe('1 250 Kč')
  })

  it('keeps the amount and currency on one line (no breaking spaces)', () => {
    expect(formatPrice(12500)).not.toMatch(/ /)
  })

  it('formats small amounts without grouping', () => {
    expect(formatPrice(8)).toBe('8 Kč')
  })
})
