import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import type { Order, SiteSetting } from '@/payload-types'
import { QrInline } from './QrInline'

type Props = { order: Order; settings: SiteSetting; locale: 'cs' | 'en' }

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function fmtCzAccount(p: SiteSetting): string {
  const pay = p.payment
  if (!pay?.accountNumber || !pay?.bankCode) return ''
  const left = pay.accountPrefix ? `${pay.accountPrefix.replace(/\D/g, '')}-` : ''
  return `${left}${pay.accountNumber.replace(/\D/g, '')}/${pay.bankCode.replace(/\D/g, '')}`
}

export async function ThankYouContent({ order, settings, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'checkout.thankYou' })
  const orderNumber = String(order.orderNumber)
  const isBank = order.paymentMethod === 'bank_transfer'

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-brand-gold">{t('title')}</h1>
        <p className="text-text-secondary">{t('body', { orderNumber })}</p>
      </div>

      <section className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">{t('paymentTitle')}</h2>
        {isBank && order.qrSpayd ? (
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
          <p className="text-sm">{t('paymentCashOnDelivery')}</p>
        )}
      </section>

      <Link href="/produkty" className="block text-center bg-brand-cream text-brand-green hover:bg-brand-cream-dark py-3 rounded-lg font-semibold">
        Pokračovat v nákupu
      </Link>
    </div>
  )
}
