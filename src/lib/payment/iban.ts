/**
 * Derives a Czech IBAN from local account components.
 * BBAN structure (20 digits): bankCode(4) + prefix(6, left-padded) + account(10, left-padded).
 * Check digits: ISO 13616, mod 97. CZ → numeric 1235.
 */
export function deriveCzIban(
  prefix: string | undefined | null,
  account: string,
  bankCode: string,
): string {
  const cleanedPrefix = (prefix ?? '').replace(/\D/g, '')
  const cleanedAccount = account.replace(/\D/g, '')
  const cleanedBankCode = bankCode.replace(/\D/g, '')

  if (cleanedAccount.length === 0 || cleanedBankCode.length !== 4) {
    throw new Error('deriveCzIban: invalid input (account empty or bankCode not 4 digits)')
  }

  const p = cleanedPrefix.padStart(6, '0')
  const a = cleanedAccount.padStart(10, '0')
  const b = cleanedBankCode.padStart(4, '0')

  const bban = `${b}${p}${a}` // 20 digits
  const remainder = Number(BigInt(`${bban}123500`) % BigInt(97))
  const check = String(98 - remainder).padStart(2, '0')

  return `CZ${check}${bban}` // 24 chars
}
