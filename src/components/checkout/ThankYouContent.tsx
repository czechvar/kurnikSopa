import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import type { Order, SiteSetting } from '@/payload-types'
import { OrderDetail } from '@/components/orders/OrderDetail'

type Props = { order: Order; settings: SiteSetting; locale: 'cs' | 'en'; isGuest: boolean; isBooking: boolean; children?: ReactNode }

export async function ThankYouContent({ order, settings, locale, isGuest, isBooking, children }: Props) {
  const t = await getTranslations({ locale, namespace: 'checkout.thankYou' })
  const tCart = await getTranslations({ locale, namespace: 'cart' })
  const orderNumber = String(order.orderNumber)

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-ink">{isBooking ? t('bookingTitle') : t('title')}</h1>
        <p className="text-ink-muted">{isBooking ? t('bookingBody', { orderNumber }) : t('body', { orderNumber })}</p>
        {isGuest && <p className="text-sm text-ink-muted">{t('guestKeepEmail')}</p>}
      </div>

      {children}

      <OrderDetail order={order} settings={settings} locale={locale} />

      <Link href="/produkty" className={buttonClass('primary', 'md', 'w-full')}>
        {tCart('cta.continueShopping')}
      </Link>
    </div>
  )
}
