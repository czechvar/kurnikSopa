import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { resolveCart } from '@/lib/cart/getOrCreateCart'
import { readGuestToken } from '@/lib/cart/guestToken.server'
import { CheckoutForm, type PickupPointOption } from '@/components/checkout/CheckoutForm'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const guestToken = await readGuestToken()

  const cart = await resolveCart(payload, { user: user ?? null, guestToken })
  if (!cart || !cart.items || cart.items.length === 0) {
    redirect({ href: '/kosik', locale })
  }

  const points = await payload.find({
    collection: 'pickup-points',
    where: { active: { equals: true } },
    sort: '-isFarm',
    limit: 50,
    depth: 0,
    locale,
  })
  const pickupPoints: PickupPointOption[] = points.docs.map(p => ({
    id: p.id,
    name: p.name,
    street: p.street,
    city: p.city,
    zip: p.zip,
    note: p.note ?? null,
    isFarm: Boolean(p.isFarm),
  }))

  const t = await getTranslations({ locale, namespace: 'checkout' })

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">{t('title')}</h1>
      <CheckoutForm
        cart={cart!}
        user={
          user
            ? {
                id: user.id,
                email: user.email,
                firstName: user.firstName ?? '',
                lastName: user.lastName ?? '',
                phone: user.phone ?? '',
              }
            : null
        }
        pickupPoints={pickupPoints}
        locale={locale}
      />
    </div>
  )
}
