import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link, redirect } from '@/lib/i18n/routing'
import type { Order } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function formatDate(iso: string, locale: 'cs' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const paymentStatusClasses: Record<NonNullable<Order['paymentStatus']>, string> = {
  pending: 'bg-amber-100 text-amber-900',
  paid: 'bg-green-100 text-green-900',
  failed: 'bg-red-100 text-red-900',
  refunded: 'bg-gray-200 text-gray-800',
}

const orderStatusClasses: Record<NonNullable<Order['orderStatus']>, string> = {
  received: 'bg-blue-100 text-blue-900',
  preparing: 'bg-amber-100 text-amber-900',
  shipped: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-green-100 text-green-900',
  cancelled: 'bg-red-100 text-red-900',
}

export default async function OrdersListPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect({ href: '/prihlaseni', locale })
  }

  const t = await getTranslations({ locale, namespace: 'account.orders' })

  const { docs: orders } = await payload.find({
    collection: 'orders',
    where: { customer: { equals: user!.id } },
    sort: '-createdAt',
    depth: 0,
    limit: 100,
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg p-8 border border-gray-200 text-center space-y-4">
          <h2 className="text-xl font-semibold">{t('empty.title')}</h2>
          <p className="text-text-secondary">{t('empty.body')}</p>
          <Link
            href="/produkty"
            className="inline-block bg-brand-cream text-brand-green hover:bg-brand-cream-dark px-6 py-3 rounded-lg font-medium"
          >
            {t('empty.cta')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const paymentClass = paymentStatusClasses[order.paymentStatus ?? 'pending']
            const orderClass = orderStatusClasses[order.orderStatus ?? 'received']
            return (
              <li key={order.id}>
                <Link
                  href={{ pathname: '/ucet/objednavky/[orderNumber]', params: { orderNumber: order.orderNumber } }}
                  className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-brand-green transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold">{t('columns.orderNumber')}: {order.orderNumber}</div>
                      <div className="text-sm text-text-secondary">{formatDate(order.createdAt, locale)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-semibold whitespace-nowrap">{formatCzk(order.totalAmount)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${paymentClass}`}>
                        {t(`paymentStatus.${order.paymentStatus ?? 'pending'}`)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${orderClass}`}>
                        {t(`orderStatus.${order.orderStatus ?? 'received'}`)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
