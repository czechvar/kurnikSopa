function stripDiacritics(s: string): string {
  // NFD splits accented chars into base + combining marks, then strip the combining-marks block.
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function ascii(s: string): string {
  return stripDiacritics(s).replace(/[^\x20-\x7E]/g, '')
}

/**
 * CZ QR Platba (SPAYD v1.0) string.
 * https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 */
export function buildSpayd(input: {
  iban: string             // e.g. CZ6520100000002901234567
  amount: number           // CZK, e.g. 1234.5
  variableSymbol: string   // numeric, ≤ 10 digits
  message: string          // free-form — will be ASCII-stripped + truncated to 60 chars
}): string {
  const amt = input.amount.toFixed(2)
  const msg = ascii(input.message).slice(0, 60)
  const vs = input.variableSymbol.replace(/\D/g, '').slice(0, 10)
  return `SPD*1.0*ACC:${input.iban}*AM:${amt}*CC:CZK*X-VS:${vs}*MSG:${msg}`
}
