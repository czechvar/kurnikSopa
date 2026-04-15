/**
 * Format price in Czech koruna format: "1 250 Kč"
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('cs-CZ')} Kč`
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
