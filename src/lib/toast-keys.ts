export type ToastKey =
  | 'loginRequiredCart'
  | 'emailVerified'
  | 'passwordReset'
  | 'addedToCart'
  | 'orderPlaced'
  | 'paymentMethodMissingBankDetails'
export type ToastType = 'success' | 'info' | 'error'

const TOAST_TYPES: readonly ToastType[] = ['success', 'info', 'error'] as const
const TOAST_KEYS: readonly ToastKey[] = [
  'loginRequiredCart',
  'emailVerified',
  'passwordReset',
  'addedToCart',
  'orderPlaced',
  'paymentMethodMissingBankDetails',
] as const

export function isToastKey(v: unknown): v is ToastKey {
  return typeof v === 'string' && (TOAST_KEYS as readonly string[]).includes(v)
}

export function isToastType(v: unknown): v is ToastType {
  return typeof v === 'string' && (TOAST_TYPES as readonly string[]).includes(v)
}

export function toastQuery(key: ToastKey, type: ToastType): { toast: ToastKey; type: ToastType } {
  return { toast: key, type }
}

export function buildToastUrl(href: string, key: ToastKey, type: ToastType): string {
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}toast=${encodeURIComponent(key)}&type=${encodeURIComponent(type)}`
}
