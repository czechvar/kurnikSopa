import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import type { Order, SiteSetting } from '@/payload-types'
import { OrderDetail } from '@/components/orders/OrderDetail'

type Props = { order: Order; settings: SiteSetting; locale: 'cs' | 'en' }

export async function ThankYouContent({ order, settings, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'checkout.thankYou' })
  const tCart = await getTranslations({ locale, namespace: 'cart' })
  const orderNumber = String(order.orderNumber)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-brand-gold">{t('title')}</h1>
        <p className="text-text-secondary">{t('body', { orderNumber })}</p>
      </div>

      <OrderDetail order={order} settings={settings} locale={locale} showQr />

      <Link href="/produkty" className="block text-center bg-brand-cream text-brand-green hover:bg-brand-cream-dark py-3 rounded-lg font-semibold">
        {tCart('cta.continueShopping')}
      </Link>
    </div>
  )
}
