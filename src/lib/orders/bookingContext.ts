import type { Payload } from 'payload'
import type { Batch, Order, PickupPoint } from '@/payload-types'
import { isConfirmationOpen } from '@/lib/batches/transitions'
import { remainingUnits } from '@/lib/batches/queries'
import { formatDay, relId } from './orderEmails'

export type PickupDayOption = { index: number; date: string; label: string; pointName: string; pointAddress: string }

export type BookingContext = {
  batch: Batch
  pickupDays: PickupDayOption[]
  /** Whether the customer may still confirm, change or cancel. */
  canChange: boolean
  /** True while the batch is open and the order still waits for the customer. */
  needsConfirmation: boolean
  /** Units the customer could still raise their order to. */
  maxQuantity: number
  currentPickupDayIndex: number | null
  deadlineLabel: string
  quantity: number
  minimumOrder: number
}

/** Everything the order pages need to show and act on a booking. Null for a buy-now order. */
export async function loadBookingContext(payload: Payload, order: Order, locale: 'cs' | 'en'): Promise<BookingContext | null> {
  const batchId = relId(order.batch)
  if (!batchId) return null
  let batch: Batch
  try {
    batch = (await payload.findByID({ collection: 'batches', id: batchId, depth: 1, locale })) as Batch
  } catch {
    return null
  }
  const pickupDays: PickupDayOption[] = (batch.pickupDays ?? []).map((d, index) => {
    const point = d.pickupPoint && typeof d.pickupPoint === 'object' ? (d.pickupPoint as PickupPoint) : null
    return {
      index,
      date: d.date,
      label: formatDay(d.date, locale),
      pointName: point?.name ?? '',
      pointAddress: point ? `${point.street}, ${point.zip} ${point.city}` : '',
    }
  })
  const line = order.items?.[0]
  const quantity = line?.quantity ?? 0
  const product = line && typeof line.product === 'object' ? line.product : null
  const activeBooking = order.orderStatus === 'booked' || order.orderStatus === 'confirmed'
  const canChange = activeBooking && (batch.status === 'planned' || isConfirmationOpen(batch))
  const currentPickupDayIndex = order.pickupDay
    ? pickupDays.findIndex(d => new Date(d.date).toDateString() === new Date(order.pickupDay as string).toDateString())
    : -1
  return {
    batch,
    pickupDays,
    canChange,
    needsConfirmation: order.orderStatus === 'booked' && isConfirmationOpen(batch),
    maxQuantity: quantity + remainingUnits(batch),
    currentPickupDayIndex: currentPickupDayIndex >= 0 ? currentPickupDayIndex : null,
    deadlineLabel: formatDay(batch.confirmationDeadline, locale),
    quantity,
    minimumOrder: product?.minimumOrder ?? 1,
  }
}
