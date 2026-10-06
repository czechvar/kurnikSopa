/** Digits-only Czech number with country code, e.g. 420774801667. */
function czDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('420') ? digits : `420${digits}`
}

export function telHref(phone: string): string {
  return `tel:+${czDigits(phone)}`
}

export function whatsappHref(phone: string): string {
  return `https://wa.me/${czDigits(phone)}`
}
