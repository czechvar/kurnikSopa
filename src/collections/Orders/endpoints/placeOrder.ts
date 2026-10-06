import type { Endpoint, PayloadRequest } from 'payload'
import { guestTokenFromCookieHeader } from '@/lib/cart/guestToken'
import { findGuestCart, getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { placeOrder } from '@/lib/orders/placeOrder'

type Body = {
  customer: { firstName: string; lastName: string; phone: string; email?: string }
  pickupPointId: number
  preferredDate: string
  customerNote?: string
  locale: 'cs' | 'en'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  const c = b.customer as Record<string, unknown> | undefined
  return (
    !!c && typeof c.firstName === 'string' && typeof c.lastName === 'string' && typeof c.phone === 'string' &&
    (c.email === undefined || typeof c.email === 'string') &&
    Number.isInteger(b.pickupPointId) &&
    typeof b.preferredDate === 'string' &&
    (b.customerNote === undefined || typeof b.customerNote === 'string') &&
    (b.locale === 'cs' || b.locale === 'en')
  )
}

/**
 * POST /api/orders/place — turn the viewer's cart into an Order.
 * Signed-in customers and guests alike; a guest must give an email so the
 * confirmation (with the link to their order) has somewhere to go.
 */
export const placeOrderEndpoint: Endpoint = {
  path: '/place',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }

    const guestToken = req.user ? null : guestTokenFromCookieHeader(req.headers.get('cookie'))
    if (!req.user && !guestToken) {
      return Response.json({ ok: false, reason: 'cartEmpty', errors: [] }, { status: 400 })
    }

    const guestEmail = body.customer.email?.trim().toLowerCase()
    if (!req.user) {
      if (!guestEmail || !EMAIL_RE.test(guestEmail)) {
        return Response.json({ ok: false, reason: 'guestEmailRequired', errors: [] }, { status: 400 })
      }
    }

    const cart = req.user
      ? await getOrCreateCart(req.payload, req.user.id)
      : await findGuestCart(req.payload, guestToken!)
    if (!cart) {
      return Response.json({ ok: false, reason: 'cartEmpty', errors: [] }, { status: 400 })
    }

    const result = await placeOrder(req.payload, {
      user: req.user ?? null,
      guest: req.user ? null : { email: guestEmail! },
      cart,
      locale: body.locale,
      customer: { firstName: body.customer.firstName, lastName: body.customer.lastName, phone: body.customer.phone },
      pickupPointId: body.pickupPointId,
      preferredDate: body.preferredDate,
      customerNote: body.customerNote,
    })

    if (!result.ok) {
      return Response.json(result, { status: result.errors.length > 0 ? 409 : 400 })
    }
    return Response.json(result, { status: 200 })
  },
}
