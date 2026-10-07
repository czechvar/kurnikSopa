import { describe, expect, it } from 'vitest'
import { guestTokenFromCookieHeader, isValidGuestToken, GUEST_CART_COOKIE } from '@/lib/cart/guestToken'

describe('guest cart token', () => {
  it('accepts UUID-like tokens and rejects junk', () => {
    expect(isValidGuestToken('5f1c2a8e-0b3d-4c7e-9a1f-2b3c4d5e6f70')).toBe(true)
    expect(isValidGuestToken('short')).toBe(false)
    expect(isValidGuestToken('has spaces in it and is long enough')).toBe(false)
    expect(isValidGuestToken("'; drop table carts; --------")).toBe(false)
    expect(isValidGuestToken(null)).toBe(false)
  })

  it('reads the token out of a Cookie header among other cookies', () => {
    const header = `payload-token=abc; ${GUEST_CART_COOKIE}=5f1c2a8e-0b3d-4c7e-9a1f-2b3c4d5e6f70; theme=dark`
    expect(guestTokenFromCookieHeader(header)).toBe('5f1c2a8e-0b3d-4c7e-9a1f-2b3c4d5e6f70')
  })

  it('returns null when the cookie is missing, empty or invalid', () => {
    expect(guestTokenFromCookieHeader(null)).toBeNull()
    expect(guestTokenFromCookieHeader('')).toBeNull()
    expect(guestTokenFromCookieHeader('payload-token=abc')).toBeNull()
    expect(guestTokenFromCookieHeader(`${GUEST_CART_COOKIE}=nope`)).toBeNull()
    expect(guestTokenFromCookieHeader(`${GUEST_CART_COOKIE}=%E0%A4%A`)).toBeNull()
  })
})
