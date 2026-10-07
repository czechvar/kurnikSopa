import type { Endpoint, PayloadRequest } from 'payload'
import { bookBatch } from '@/lib/orders/book'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = {
  batchId: number
  quantity: number
  pickupDayIndex?: number | null
  customer: { firstName: string; lastName: string; phone: string; email?: string }
  customerNote?: string
  locale: 'cs' | 'en'
}

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  const c = b.customer as Record<string, unknown> | undefined
  return (
    Number.isInteger(b.batchId) && Number.isInteger(b.quantity) &&
    (b.pickupDayIndex === undefined || b.pickupDayIndex === null || Number.isInteger(b.pickupDayIndex)) &&
    !!c && typeof c.firstName === 'string' && typeof c.lastName === 'string' && typeof c.phone === 'string' &&
    (c.email === undefined || typeof c.email === 'string') &&
    (b.customerNote === undefined || typeof b.customerNote === 'string') &&
    (b.locale === 'cs' || b.locale === 'en')
  )
}

/** POST /api/orders/book — book units of a batch, as a signed-in customer or a guest. */
export const bookEndpoint: Endpoint = {
  path: '/book',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })

    const guestEmail = body.customer.email?.trim().toLowerCase()
    if (!req.user && (!guestEmail || !EMAIL_RE.test(guestEmail))) {
      return Response.json({ ok: false, reason: 'guestEmailRequired' }, { status: 400 })
    }

    const result = await bookBatch(req.payload, {
      user: req.user ?? null,
      guest: req.user ? null : { email: guestEmail! },
      batchId: body.batchId,
      quantity: body.quantity,
      pickupDayIndex: body.pickupDayIndex ?? null,
      customer: { firstName: body.customer.firstName, lastName: body.customer.lastName, phone: body.customer.phone },
      customerNote: body.customerNote,
      locale: body.locale,
    })
    if (!result.ok) {
      const status = result.reason === 'batchFull' || result.reason === 'batchNotBookable' ? 409 : 400
      return Response.json(result, { status })
    }
    return Response.json(result, { status: 200 })
  },
}
