import type { Payload } from 'payload'
import type { Batch } from '@/payload-types'
import { BOOKABLE_STATUSES } from './capacity'

/** Batches a customer may book on for a product, soonest deadline first, planned ones last. */
export async function findBookableBatches(payload: Payload, productId: number, locale: 'cs' | 'en'): Promise<Batch[]> {
  const result = await payload.find({
    collection: 'batches',
    where: {
      and: [
        { product: { equals: productId } },
        { status: { in: [...BOOKABLE_STATUSES] } },
      ],
    },
    sort: 'confirmationDeadline',
    depth: 1,
    limit: 20,
    locale,
  })
  return result.docs.sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'open' ? -1 : 1
  })
}

export function remainingUnits(batch: Pick<Batch, 'capacity' | 'bookedCount'>): number {
  return Math.max(0, batch.capacity - (batch.bookedCount ?? 0))
}
