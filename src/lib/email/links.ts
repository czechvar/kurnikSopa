type AuthLinkKind = 'verify' | 'reset'

export function buildAuthUrl(
  locale: 'cs' | 'en',
  kind: AuthLinkKind,
  token: string,
  email?: string,
): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const slug =
    kind === 'verify'
      ? locale === 'en'
        ? 'verify-email'
        : 'overeni-emailu'
      : locale === 'en'
        ? 'reset-password'
        : 'obnova-hesla'
  const url = `${base}/${locale}/${slug}/${token}`
  return email ? `${url}?email=${encodeURIComponent(email)}` : url
}
