import { describe, expect, it } from 'vitest'
import { deriveCzIban } from '@/lib/payment/iban'

describe('deriveCzIban', () => {
  it('builds a 24-character CZ IBAN from a known fixture', () => {
    const iban = deriveCzIban('', '2901234567', '2010')
    expect(iban).toHaveLength(24)
    expect(iban.startsWith('CZ')).toBe(true)
    // Reference value computed from the live deriveCzIban implementation.
    expect(iban).toBe('CZ5520100000002901234567')
  })

  it('zero-pads prefix to 6 digits and account to 10', () => {
    const iban = deriveCzIban('19', '12345', '0800')
    // Prefix → 000019, account → 0000012345, bank → 0800.
    expect(iban).toMatch(/^CZ\d{22}$/)
    // BBAN layout: bankCode(4) + prefix(6) + account(10).
    expect(iban.slice(-10)).toBe('0000012345')   // account
    expect(iban.slice(-16, -10)).toBe('000019')  // prefix
    expect(iban.slice(-20, -16)).toBe('0800')    // bank code
  })

  it('strips non-digit characters from all inputs', () => {
    const a = deriveCzIban(' 19 ', '12-34-5', '0800')
    const b = deriveCzIban('19', '12345', '0800')
    expect(a).toBe(b)
  })

  it('throws on empty account', () => {
    expect(() => deriveCzIban('', '', '0800')).toThrow(/invalid input/i)
    expect(() => deriveCzIban('', '   ', '0800')).toThrow(/invalid input/i)
  })

  it('throws when bank code is not 4 digits after stripping', () => {
    expect(() => deriveCzIban('', '12345', '80')).toThrow(/invalid input/i)
    expect(() => deriveCzIban('', '12345', '08000')).toThrow(/invalid input/i)
  })

  it('produces the correct check digit for a second reference account', () => {
    // Reference: account 35-1234567890/0100 (CSOB-style prefix+account).
    // Value computed from the live deriveCzIban implementation.
    const iban = deriveCzIban('35', '1234567890', '0100')
    expect(iban).toMatch(/^CZ\d{22}$/)
    expect(iban).toBe('CZ1101000000351234567890')
  })
})
