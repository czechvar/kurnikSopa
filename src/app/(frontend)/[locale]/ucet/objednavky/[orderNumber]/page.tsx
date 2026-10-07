import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link, redirect } from '@/lib/i18n/routing'
import { OrderDetail } from '@/components/orders/OrderDetail'
import { BookingPanel } from '@/components/orders/BookingPanel'
import { DEFAULT_ORDER_STATUS, orderStatusClasses, paymentStatusClasses } from '@/components/orders/statusClasses'
import type { SiteSetting } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en'; orderNumber: string }> }

export default async function OrderHistoryDetailPage({ params }: Props) {
  const { locale, orderNumber } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect({ href: '/prihlaseni', locale })
  }

  // customer filter is defense-in-depth on top of the collection's access rule —
  // returns notFound (not forbidden) so we don't leak whether an order# exists
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      orderNumber: { equals: orderNumber },
      customer: { equals: user!.id },
    },
    limit: 1,
    depth: 1,
  })
  const order = docs[0]
  if (!order) notFound()

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const t = await getTranslations({ locale, namespace: 'account.orders' })

  const paymentClass = paymentStatusClasses[order.paymentStatus ?? 'unpaid']
  const orderClass = orderStatusClasses[order.orderStatus ?? DEFAULT_ORDER_STATUS]

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <nav className="text-sm">
        <Link href="/ucet/objednavky" className="font-medium text-ink underline underline-offset-4 hover:text-ink-deep">
          {t('detail.backToList')}
        </Link>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-ink">{t('detail.breadcrumb')} · {order.orderNumber}</h1>
        <div className="flex flex-wrap gap-2">
          <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${paymentClass}`}>
            {t(`paymentStatus.${order.paymentStatus ?? 'unpaid'}`)}
          </span>
          <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${orderClass}`}>
            {t(`orderStatus.${order.orderStatus ?? DEFAULT_ORDER_STATUS}`)}
          </span>
        </div>
      </div>

      <BookingPanel payload={payload} order={order} settings={settings} locale={locale} token={null} />
      <OrderDetail order={order} settings={settings} locale={locale} />
    </div>
  )
}
