import { getTranslations } from 'next-intl/server'
import type { Payload } from 'payload'
import type { Order, SiteSetting } from '@/payload-types'
import { loadBookingContext } from '@/lib/orders/bookingContext'
import { formatDay } from '@/lib/orders/orderEmails'
import { formatPhone } from '@/lib/utils'
import { BookingActions } from './BookingActions'

type Props = {
  payload: Payload
  order: Order
  settings: SiteSetting
  locale: 'cs' | 'en'
  /** The guest's access token, so the actions can authenticate without a login. */
  token: string | null
}

/**
 * The booking state of an order on a Batch, with the actions the customer
 * may still take: pick a pickup day and confirm, change quantity, cancel.
 */
export async function BookingPanel({ payload, order, settings, locale, token }: Props) {
  const ctx = await loadBookingContext(payload, order, locale)
  if (!ctx) return null
  const t = await getTranslations({ locale, namespace: 'bookingPanel' })
  const phone = settings.contact?.phone ? formatPhone(settings.contact.phone) : null

  let statusLine: string
  switch (order.orderStatus) {
    case 'booked':
      statusLine = ctx.needsConfirmation ? t('statusConfirmNow', { date: ctx.deadlineLabel }) : t('statusBooked')
      break
    case 'confirmed':
      statusLine = ctx.canChange
        ? t('statusConfirmed', { date: formatDay(order.pickupDay, locale), deadline: ctx.deadlineLabel })
        : t('statusConfirmedFinal', { date: formatDay(order.pickupDay, locale) })
      break
    case 'released':
      statusLine = t('released')
      break
    case 'cancelled':
      statusLine = t('cancelled')
      break
    default:
      statusLine = ''
  }

  return (
    <section className="space-y-3 rounded-md border border-line bg-ground p-6 text-sm">
      <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
      <p>
        <span className="text-ink-muted">{t('batch')}: </span>
        <strong>{ctx.batch.label}</strong>
      </p>
      {statusLine && <p className={ctx.needsConfirmation ? 'rounded bg-accent/25 px-3 py-2 font-semibold text-ink-deep' : ''}>{statusLine}</p>}
      {ctx.batch.note && <p className="whitespace-pre-line text-ink-muted">{ctx.batch.note}</p>}

      {ctx.canChange && ctx.batch.status === 'open' && (
        <BookingActions
          orderNumber={String(order.orderNumber)}
          token={token}
          pickupDays={ctx.pickupDays.map(d => ({ index: d.index, label: d.pointName ? `${d.label} — ${d.pointName}` : d.label }))}
          currentPickupDayIndex={ctx.currentPickupDayIndex}
          quantity={ctx.quantity}
          minimumOrder={ctx.minimumOrder}
          maxQuantity={ctx.maxQuantity}
          mode={order.orderStatus === 'booked' ? 'confirm' : 'update'}
        />
      )}
      {ctx.canChange && ctx.batch.status === 'planned' && (
        <BookingActions
          orderNumber={String(order.orderNumber)}
          token={token}
          pickupDays={[]}
          currentPickupDayIndex={null}
          quantity={ctx.quantity}
          minimumOrder={ctx.minimumOrder}
          maxQuantity={ctx.maxQuantity}
          mode="cancelOnly"
        />
      )}
      {!ctx.canChange && (order.orderStatus === 'booked' || order.orderStatus === 'confirmed') && (
        <p className="text-ink-muted">{phone ? t('closed', { phone }) : t('closedNoPhone')}</p>
      )}
    </section>
  )
}
