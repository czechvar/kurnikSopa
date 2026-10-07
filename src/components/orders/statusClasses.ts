import type { Order } from '@/payload-types'

/** Pill colours for order badges, shared by the order list and detail pages. */
export const paymentStatusClasses: Record<NonNullable<Order['paymentStatus']>, string> = {
  unpaid: 'bg-amber-100 text-amber-900',
  paid: 'bg-green-100 text-green-900',
}

export const orderStatusClasses: Record<NonNullable<Order['orderStatus']>, string> = {
  booked: 'bg-blue-100 text-blue-900',
  confirmed: 'bg-indigo-100 text-indigo-900',
  ready: 'bg-amber-100 text-amber-900',
  picked_up: 'bg-green-100 text-green-900',
  released: 'bg-gray-200 text-gray-800',
  cancelled: 'bg-red-100 text-red-900',
}

export const DEFAULT_ORDER_STATUS: NonNullable<Order['orderStatus']> = 'confirmed'
