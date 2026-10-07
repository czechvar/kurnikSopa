import type { Order } from '@/payload-types'

/** Pill colours for order badges, shared by the order list and detail pages. */
export const paymentStatusClasses: Record<NonNullable<Order['paymentStatus']>, string> = {
  unpaid: 'bg-amber-100 text-amber-900',
  paid: 'bg-green-100 text-green-900',
}

export const orderStatusClasses: Record<NonNullable<Order['orderStatus']>, string> = {
  received: 'bg-blue-100 text-blue-900',
  preparing: 'bg-amber-100 text-amber-900',
  shipped: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-green-100 text-green-900',
  cancelled: 'bg-red-100 text-red-900',
}
