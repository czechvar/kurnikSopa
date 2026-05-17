import type { Payload } from 'payload'

const PREFIX_LEN = 4   // YYYY
const SEQ_LEN = 6      // NNNNNN
const TOTAL_LEN = PREFIX_LEN + SEQ_LEN

/**
 * Returns the next available orderNumber in the form YYYYNNNNNN (10 digits).
 * Sequence resets each calendar year.
 * Note: not concurrency-safe — acceptable at single-staff launch volume.
 */
export async function generateOrderNumber(payload: Payload, now: Date = new Date()): Promise<string> {
  const year = String(now.getUTCFullYear())
  const yearPrefix = year.slice(0, PREFIX_LEN)

  const last = await payload.find({
    collection: 'orders',
    where: { orderNumber: { like: `${yearPrefix}%` } },
    sort: '-orderNumber',
    limit: 1,
    depth: 0,
  })

  let nextSeq = 1
  if (last.docs[0]) {
    const lastNum = String(last.docs[0].orderNumber)
    const lastSeq = parseInt(lastNum.slice(PREFIX_LEN), 10)
    if (Number.isFinite(lastSeq)) nextSeq = lastSeq + 1
  }

  if (nextSeq >= 10 ** SEQ_LEN) {
    throw new Error(`Order sequence exhausted for ${year} — more than ${10 ** SEQ_LEN} orders this year`)
  }

  return `${yearPrefix}${String(nextSeq).padStart(SEQ_LEN, '0')}`
}
