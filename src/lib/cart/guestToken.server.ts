import { cookies } from 'next/headers'
import { GUEST_CART_COOKIE, isValidGuestToken } from './guestToken'

/** Read the guest-cart token from the request cookies in a Server Component. */
export async function readGuestToken(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(GUEST_CART_COOKIE)?.value
  return isValidGuestToken(value) ? value : null
}
