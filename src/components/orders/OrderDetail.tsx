import { getTranslations } from 'next-intl/server'
import type { Order, Product, SiteSetting } from '@/payload-types'
import { QrInline } from '@/components/checkout/QrInline'

type Props = {
  order: Order
  settings: SiteSetting
  locale: 'cs' | 'en'
  /** When false, the QR / bank details block is hidden even for bank_transfer orders. */
  showQr: boolean
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

function fmtCzAccount(p: SiteSetting): string {
  const pay = p.payment
  if (!pay?.accountNumber || !pay?.bankCode) return ''
  const left = pay.accountPrefix ? `${pay.accountPrefix.replace(/\D/g, '')}-` : ''
  return `${left}${pay.accountNumber.replace(/\D/g, '')}/${pay.bankCode.replace(/\D/g, '')}`
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

export async function OrderDetail({ order, settings, locale, showQr }: Props) {
  const t = await getTranslations({ locale, namespace: 'orderDetail' })

  const isBank = order.paymentMethod === 'bank_transfer'
  const orderNumber = String(order.orderNumber)
  const items = order.items ?? []

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">{t('itemsTitle')}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-secondary">
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
                <tr key={idx} className="border-t border-gray-200">
                  <td className="py-2">
                    {name}
                    {unit && <span className="text-text-secondary"> ({unit})</span>}
                  </td>
                  <td className="py-2 text-right">{it.quantity}×</td>
                  <td className="py-2 text-right">{formatCzk(unitPrice)}</td>
                  <td className="py-2 text-right font-semibold">{formatCzk(lineTotal)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300">
              <td colSpan={3} className="pt-3 text-right font-bold">{t('total')}</td>
              <td className="pt-3 text-right font-bold">{formatCzk(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-2 text-sm">
        <h2 className="text-lg font-semibold mb-3">{t('deliveryTitle')}</h2>
        {order.deliveryMethod === 'pickup' ? (
          <p>{t('pickup')}</p>
        ) : (
          <p>
            {t('delivery')}
            {order.deliveryAddress?.street && (
              <>: <strong>{order.deliveryAddress.street}, {order.deliveryAddress.zip} {order.deliveryAddress.city}</strong></>
            )}
          </p>
        )}
        {order.preferredDate && (
          <p><span className="text-text-secondary">{t('preferredDate')}: </span>{formatDate(order.preferredDate, locale)}</p>
        )}
        {order.customerNote && (
          <p><span className="text-text-secondary">{t('customerNote')}: </span>{order.customerNote}</p>
        )}
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">{t('paymentTitle')}</h2>
        {isBank ? (
          showQr && order.qrSpayd ? (
            <div className="space-y-4">
              <p className="text-sm">{t('paymentBankTransfer')}</p>
              <div className="flex justify-center">
                <QrInline spayd={order.qrSpayd} alt={t('qrAlt')} />
              </div>
              <p className="text-sm text-text-secondary">{t('manualFallback')}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-text-secondary">{t('accountLabel')}</dt>
                <dd className="font-semibold">{fmtCzAccount(settings)}</dd>
                <dt className="text-text-secondary">{t('bankLabel')}</dt>
                <dd className="font-semibold">{settings.payment?.bankName ?? ''}</dd>
                <dt className="text-text-secondary">{t('amountLabel')}</dt>
                <dd className="font-semibold">{formatCzk(order.totalAmount)}</dd>
                <dt className="text-text-secondary">{t('vsLabel')}</dt>
                <dd className="font-semibold">{orderNumber}</dd>
              </dl>
            </div>
          ) : (
            <p className="text-sm">{t('paymentPaid')}</p>
          )
        ) : (
          <p className="text-sm">{t('paymentCashOnDelivery')}</p>
        )}
      </section>
    </div>
  )
}
