'use client'

import { GUEST_CART_COOKIE, isValidGuestToken } from './guestToken'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function readCookie(): string | null {
  if (typeof document === 'undefined') return null
  for (const part of document.cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === GUEST_CART_COOKIE) {
      const value = decodeURIComponent(rest.join('='))
      return isValidGuestToken(value) ? value : null
    }
  }
  return null
}

/**
 * Return the browser's guest-cart token, creating the cookie on first use.
 * Not httpOnly on purpose: the token only identifies a cart, and the server
 * never trusts it for anything except that cart.
 */
export function ensureGuestToken(): string {
  const existing = readCookie()
  if (existing) return existing
  const token = crypto.randomUUID()
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${GUEST_CART_COOKIE}=${encodeURIComponent(token)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`
  return token
}
