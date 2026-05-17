import type { Endpoint, PayloadRequest } from 'payload'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { placeOrder } from '@/lib/orders/placeOrder'

type Body = {
  customer: { firstName: string; lastName: string; phone: string }
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; zip: string }
  preferredDate: string
  customerNote?: string
  paymentMethod: 'bank_transfer' | 'cash_on_delivery'
  locale: 'cs' | 'en'
}

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  const c = b.customer as Record<string, unknown> | undefined
  return (
    !!c && typeof c.firstName === 'string' && typeof c.lastName === 'string' && typeof c.phone === 'string' &&
    (b.deliveryMethod === 'pickup' || b.deliveryMethod === 'delivery') &&
    typeof b.preferredDate === 'string' &&
    (b.paymentMethod === 'bank_transfer' || b.paymentMethod === 'cash_on_delivery') &&
    (b.locale === 'cs' || b.locale === 'en')
  )
}

export const placeOrderEndpoint: Endpoint = {
  path: '/place',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) {
      return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }

    if (body.deliveryMethod === 'delivery') {
      const a = body.deliveryAddress
      if (!a || !a.street || !a.city || !a.zip) {
        return Response.json({ ok: false, reason: 'invalidAddress' }, { status: 400 })
      }
    }

    const cart = await getOrCreateCart(req.payload, req.user.id)
    const result = await placeOrder(req.payload, {
      user: req.user,
      cart,
      locale: body.locale,
      customer: body.customer,
      deliveryMethod: body.deliveryMethod,
      deliveryAddress: body.deliveryMethod === 'delivery' ? body.deliveryAddress! : null,
      preferredDate: body.preferredDate,
      customerNote: body.customerNote,
      paymentMethod: body.paymentMethod,
    })

    if (!result.ok) {
      return Response.json(result, { status: result.errors.length > 0 ? 409 : 400 })
    }
    return Response.json(result, { status: 200 })
  },
}
