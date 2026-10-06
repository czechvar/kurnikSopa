import type { Product } from '@/payload-types'

export type Unavailability = 'outOfStock' | 'outOfSeason'

type AvailabilityInput = Pick<Product, 'inStock' | 'seasonal' | 'availableFrom' | 'availableTo'>

/**
 * Whether a buy-now product can be ordered today. Shared by the catalogue
 * pages (hide the button) and by order placement (reject the line), so the
 * two can never disagree.
 */
export function availabilityOf(product: AvailabilityInput, now: Date = new Date()): { available: true } | { available: false; reason: Unavailability } {
  if (product.inStock === false) return { available: false, reason: 'outOfStock' }
  if (product.seasonal) {
    const from = product.availableFrom ? new Date(product.availableFrom) : null
    const to = product.availableTo ? new Date(product.availableTo) : null
    if (from && !Number.isNaN(from.getTime()) && now < from) return { available: false, reason: 'outOfSeason' }
    if (to && !Number.isNaN(to.getTime()) && now > endOfDay(to)) return { available: false, reason: 'outOfSeason' }
  }
  return { available: true }
}

export function isAvailableNow(product: AvailabilityInput, now: Date = new Date()): boolean {
  return availabilityOf(product, now).available
}

/** `availableTo` is a date; the product stays available through that whole day. */
function endOfDay(d: Date): Date {
  const e = new Date(d)
  e.setUTCHours(23, 59, 59, 999)
  return e
}
