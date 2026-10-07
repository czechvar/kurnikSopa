/**
 * Guest carts are keyed by a random token the browser keeps in a cookie.
 * This module is runtime-agnostic (no Next or DOM imports) so access rules,
 * hooks and endpoints can all share it.
 */
export const GUEST_CART_COOKIE = 'ks_cart'

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/

export function isValidGuestToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value)
}

/** Parse the guest token out of a raw `Cookie` header. */
export function guestTokenFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (name !== GUEST_CART_COOKIE) continue
    const raw = part.slice(eq + 1).trim()
    let value: string
    try {
      value = decodeURIComponent(raw)
    } catch {
      return null
    }
    return isValidGuestToken(value) ? value : null
  }
  return null
}
