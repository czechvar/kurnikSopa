import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import type { SiteSetting } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect({ href: '/prihlaseni', locale })
  }

  const cart = await getOrCreateCart(payload, user!.id)
  if (!cart.items || cart.items.length === 0) {
    redirect({ href: '/kosik', locale })
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const t = await getTranslations({ locale, namespace: 'checkout' })

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <CheckoutForm
        cart={cart}
        user={{
          id: user!.id,
          email: user!.email,
          firstName: user!.firstName ?? '',
          lastName: user!.lastName ?? '',
          phone: user!.phone ?? '',
          addresses: user!.addresses ?? [],
        }}
        farm={{
          address: {
            street: settings.address?.street ?? '',
            city: settings.address?.city ?? '',
            zip: settings.address?.zip ?? '',
          },
          phone: settings.contact?.phone ?? null,
          openingHours: settings.openingHours ?? null,
        }}
        bankConfigured={Boolean(settings.payment?.accountNumber && settings.payment?.bankCode)}
        locale={locale}
      />
    </div>
  )
}
