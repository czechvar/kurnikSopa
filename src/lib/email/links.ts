type AuthLinkKind = 'verify' | 'reset'

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export function buildAuthUrl(
  locale: 'cs' | 'en',
  kind: AuthLinkKind,
  token: string,
  email?: string,
): string {
  const slug =
    kind === 'verify'
      ? locale === 'en'
        ? 'verify-email'
        : 'overeni-emailu'
      : locale === 'en'
        ? 'reset-password'
        : 'obnova-hesla'
  const url = `${baseUrl()}/${locale}/${slug}/${token}`
  return email ? `${url}?email=${encodeURIComponent(email)}` : url
}

/**
 * The order page, reachable without a login through the order's access token.
 * Guests have no account, so this link in the confirmation email is the only
 * way back to their order.
 */
export function buildOrderUrl(locale: 'cs' | 'en', orderNumber: string, accessToken: string): string {
  const slug = locale === 'en' ? 'checkout/thank-you' : 'pokladna/dekujeme'
  return `${baseUrl()}/${locale}/${slug}/${encodeURIComponent(orderNumber)}?t=${encodeURIComponent(accessToken)}`
}
