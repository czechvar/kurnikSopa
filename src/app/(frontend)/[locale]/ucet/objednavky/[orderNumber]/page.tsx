import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link, redirect } from '@/lib/i18n/routing'
import { OrderDetail } from '@/components/orders/OrderDetail'
import type { SiteSetting } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en'; orderNumber: string }> }

const paymentStatusClasses = {
  pending: 'bg-amber-100 text-amber-900',
  paid: 'bg-green-100 text-green-900',
  failed: 'bg-red-100 text-red-900',
  refunded: 'bg-gray-200 text-gray-800',
} as const

const orderStatusClasses = {
  received: 'bg-blue-100 text-blue-900',
  preparing: 'bg-amber-100 text-amber-900',
  shipped: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-green-100 text-green-900',
  cancelled: 'bg-red-100 text-red-900',
} as const

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

  const showQr = order.paymentMethod === 'bank_transfer' && order.paymentStatus !== 'paid'
  const paymentClass = paymentStatusClasses[order.paymentStatus ?? 'pending']
  const orderClass = orderStatusClasses[order.orderStatus ?? 'received']

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <nav className="text-sm">
        <Link href="/ucet/objednavky" className="text-brand-gold hover:underline">
          {t('detail.backToList')}
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('detail.breadcrumb')} · {order.orderNumber}</h1>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${paymentClass}`}>
            {t(`paymentStatus.${order.paymentStatus ?? 'pending'}`)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${orderClass}`}>
            {t(`orderStatus.${order.orderStatus ?? 'received'}`)}
          </span>
        </div>
      </div>

      {showQr && (
        <p className="bg-amber-100 text-amber-900 rounded-lg px-4 py-3 text-sm">
          {t('detail.unpaidNotice')}
        </p>
      )}

      <OrderDetail order={order} settings={settings} locale={locale} showQr={showQr} />
    </div>
  )
}
