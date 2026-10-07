import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link, redirect } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import { DEFAULT_ORDER_STATUS, orderStatusClasses, paymentStatusClasses } from '@/components/orders/statusClasses'

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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{t('title')}</h1>

      {orders.length === 0 ? (
        <div className="space-y-4 rounded-md border border-line bg-ground p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">{t('empty.title')}</h2>
          <p className="text-ink-muted">{t('empty.body')}</p>
          <Link href="/produkty" className={buttonClass('primary')}>
            {t('empty.cta')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const paymentClass = paymentStatusClasses[order.paymentStatus ?? 'unpaid']
            const orderClass = orderStatusClasses[order.orderStatus ?? DEFAULT_ORDER_STATUS]
            return (
              <li key={order.id}>
                <Link
                  href={{ pathname: '/ucet/objednavky/[orderNumber]', params: { orderNumber: String(order.orderNumber) } }}
                  className="block rounded-md border border-line bg-ground p-4 transition-colors hover:border-ink"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-ink">{t('columns.orderNumber')}: {order.orderNumber}</div>
                      <div className="text-sm text-ink-muted">{formatDate(order.createdAt, locale)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="whitespace-nowrap font-semibold">{formatCzk(order.totalAmount)}</span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${paymentClass}`}>
                        {t(`paymentStatus.${order.paymentStatus ?? 'unpaid'}`)}
                      </span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${orderClass}`}>
                        {t(`orderStatus.${order.orderStatus ?? DEFAULT_ORDER_STATUS}`)}
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
