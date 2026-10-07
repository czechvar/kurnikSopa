import { getTranslations } from 'next-intl/server'
import type { Order, PickupPoint, Product, SiteSetting } from '@/payload-types'

type Props = {
  order: Order
  settings: SiteSetting
  locale: 'cs' | 'en'
}

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function formatDate(iso: string | null | undefined, locale: 'cs' | 'en'): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function productName(p: Product | number, locale: 'cs' | 'en'): string {
  if (typeof p !== 'object') return '?'
  if (typeof p.name === 'string') return p.name
  return (p.name as Record<string, string>)?.[locale] ?? '?'
}

function productUnit(p: Product | number): string | null {
  if (typeof p !== 'object') return null
  return p.unit ?? null
}

/**
 * Where the order is collected. Orders carry a Pickup Point; the farm's
 * address from SiteSettings is the fallback for orders placed before pickup
 * points existed.
 */
function pickupPlace(order: Order, settings: SiteSetting): { name: string; address: string; note: string | null } {
  const pp = order.pickupPoint
  if (pp && typeof pp === 'object') {
    const p = pp as PickupPoint
    return { name: p.name, address: `${p.street}, ${p.zip} ${p.city}`, note: p.note ?? null }
  }
  const a = settings.address
  return {
    name: settings.farmName,
    address: [a?.street, [a?.zip, a?.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    note: settings.openingHours ?? null,
  }
}

export async function OrderDetail({ order, settings, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'orderDetail' })
  const items = order.items ?? []
  const isHistoricDelivery = order.deliveryMethod === 'delivery'
  const place = pickupPlace(order, settings)

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-ground p-6">
        <h2 className="mb-3 text-lg font-semibold text-ink">{t('itemsTitle')}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted">
              <th className="pb-2 font-medium">{t('itemsTitle')}</th>
              <th className="pb-2 text-right font-medium">{t('qty')}</th>
              <th className="pb-2 text-right font-medium">{t('unitPrice')}</th>
              <th className="pb-2 text-right font-medium">{t('lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const p = it.product
              const name = productName(p, locale)
              const unit = productUnit(p)
              const unitPrice = it.priceAtPurchase
              const lineTotal = unitPrice * it.quantity
              return (
                <tr key={idx} className="border-t border-line">
                  <td className="py-2">
                    {name}
                    {unit && <span className="text-ink-muted"> ({unit})</span>}
                  </td>
                  <td className="py-2 text-right">{it.quantity}×</td>
                  <td className="py-2 text-right">{formatCzk(unitPrice)}</td>
                  <td className="py-2 text-right font-semibold">{formatCzk(lineTotal)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td colSpan={3} className="pt-3 text-right font-bold">{t('total')}</td>
              <td className="pt-3 text-right font-bold">{formatCzk(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="space-y-2 rounded-md border border-line bg-ground p-6 text-sm">
        <h2 className="mb-3 text-lg font-semibold text-ink">{t('pickupTitle')}</h2>
        {isHistoricDelivery ? (
          <p>
            {t('deliveryHistoric')}
            {order.deliveryAddress?.street && (
              <>: <strong>{order.deliveryAddress.street}, {order.deliveryAddress.zip} {order.deliveryAddress.city}</strong></>
            )}
          </p>
        ) : (
          <div className="space-y-1">
            <p><span className="text-ink-muted">{t('pickupPoint')}: </span><strong>{place.name}</strong></p>
            <p>{place.address}</p>
            {place.note && <p className="whitespace-pre-line text-ink-muted">{place.note}</p>}
          </div>
        )}
        {order.preferredDate && (
          <p><span className="text-ink-muted">{t('preferredDate')}: </span>{formatDate(order.preferredDate, locale)}</p>
        )}
        {order.customerNote && (
          <p><span className="text-ink-muted">{t('customerNote')}: </span>{order.customerNote}</p>
        )}
      </section>

      <section className="rounded-md border border-line bg-ground p-6">
        <h2 className="mb-3 text-lg font-semibold text-ink">{t('paymentTitle')}</h2>
        <p className="text-sm">{order.paymentStatus === 'paid' ? t('paymentPaid') : t('paymentCash', { amount: formatCzk(order.totalAmount) })}</p>
      </section>
    </div>
  )
}
