import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { resolveCart } from '@/lib/cart/getOrCreateCart'
import { readGuestToken } from '@/lib/cart/guestToken.server'
import { CartView } from '@/components/cart/CartView'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CartPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const guestToken = await readGuestToken()

  // Guests shop too: their cart lives behind the cookie token until they
  // either order as a guest or log in (when it merges into their account).
  const cart = await resolveCart(payload, { user: user ?? null, guestToken })
  const t = await getTranslations({ locale, namespace: 'cart' })

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">{t('title')}</h1>
      <CartView cart={cart} locale={locale} />
    </div>
  )
}
