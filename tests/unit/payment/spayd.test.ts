import { describe, expect, it } from 'vitest'
import { buildSpayd } from '@/lib/payment/spayd'

describe('buildSpayd', () => {
  it('builds the canonical SPAYD string with all fields', () => {
    // Order numbers are 10 digits (YYYYNNNNNN per src/lib/orders/orderNumber.ts).
    // Use a 10-digit VS here so this happy-path test exercises pass-through only,
    // not truncation — truncation has its own test below.
    const out = buildSpayd({
      iban: 'CZ6520100000002901234567',
      amount: 1234.5,
      variableSymbol: '2026000001',
      message: 'Kurnik Sopa 2026000001',
    })
    expect(out).toBe(
      'SPD*1.0*ACC:CZ6520100000002901234567*AM:1234.50*CC:CZK*X-VS:2026000001*MSG:Kurnik Sopa 2026000001',
    )
  })

  it('formats amount with two decimals when whole', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 0, variableSymbol: '1', message: 'x' })
    expect(out).toContain('AM:0.00')
  })

  it('formats amount with two decimals when one decimal', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 50.5, variableSymbol: '1', message: 'x' })
    expect(out).toContain('AM:50.50')
  })

  it('always uses CZK currency code', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: 'x' })
    expect(out).toContain('CC:CZK')
  })

  it('strips non-digits from variable symbol and truncates to 10 digits', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '2026-000001234', message: 'x' })
    expect(out).toContain('X-VS:2026000001')
  })

  it('strips diacritics from message', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: 'Příliš žluťoučký kůň' })
    expect(out).toContain('MSG:Prilis zlutoucky kun')
  })

  it('truncates message to 60 characters after ASCII normalization', () => {
    const long = 'a'.repeat(100)
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: long })
    const msg = out.split('MSG:')[1]
    expect(msg).toHaveLength(60)
  })

  it('removes non-printable characters from message', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: 'hi\x00\x07there' })
    expect(out).toContain('MSG:hithere')
  })
})
