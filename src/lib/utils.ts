/**
 * Format price in Czech koruna format: "1 250 Kč"
 */
export function formatPrice(amount: number): string {
  // ICU groups cs-CZ thousands with a narrow no-break space on some runtimes
  // and a plain one on others; normalise to U+00A0 and keep "Kč" attached.
  const grouped = amount.toLocaleString('cs-CZ').replace(/[\s\u202f]/g, '\u00a0')
  return `${grouped}\u00a0Kč`
}

/**
 * Format date in Czech format: "15. dubna 2026"
 */
export function formatDate(date: string | Date, locale: string = 'cs'): string {
  const d = new Date(date)
  return d.toLocaleDateString(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format phone number: "+420 774 801 667"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `+420 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  return phone
}
