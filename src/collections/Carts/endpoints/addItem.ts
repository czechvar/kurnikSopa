import type { Endpoint, PayloadRequest } from 'payload'
import { guestTokenFromCookieHeader } from '@/lib/cart/guestToken'
import { findGuestCart, getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { availabilityOf } from '@/lib/products/availability'

type Body = { productId: number; quantity: number }

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  return Number.isInteger(b.productId) && Number.isInteger(b.quantity) && (b.quantity as number) >= 1
}

/**
 * POST /api/carts/add — add a product to the viewer's cart, creating the cart
 * on first use. Works for signed-in customers (by user) and for guests (by the
 * token cookie), so the storefront has one code path.
 */
export const addItemEndpoint: Endpoint = {
  path: '/add',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })

    const guestToken = req.user ? null : guestTokenFromCookieHeader(req.headers.get('cookie'))
    if (!req.user && !guestToken) {
      return Response.json({ ok: false, reason: 'guestTokenMissing' }, { status: 401 })
    }

    let product
    try {
      product = await req.payload.findByID({ collection: 'products', id: body.productId, depth: 0 })
    } catch {
      product = null
    }
    if (!product || product.status !== 'published') {
      return Response.json({ ok: false, reason: 'productNotFound' }, { status: 404 })
    }
    if (product.soldBy === 'batch') {
      return Response.json({ ok: false, reason: 'bookingOnly' }, { status: 409 })
    }
    const availability = availabilityOf(product)
    if (!availability.available) {
      return Response.json({ ok: false, reason: availability.reason }, { status: 409 })
    }

    const cart = req.user
      ? await getOrCreateCart(req.payload, req.user.id)
      : (await findGuestCart(req.payload, guestToken!)) ??
        (await req.payload.create({ collection: 'carts', data: { guestToken, items: [] }, depth: 0 }))

    const items = (cart.items ?? []).map(it => ({
      product: (typeof it.product === 'object' ? it.product.id : it.product) as number,
      quantity: it.quantity,
    }))
    const idx = items.findIndex(it => it.product === body.productId)
    if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + body.quantity }
    else items.push({ product: body.productId, quantity: body.quantity })

    const line = items.find(it => it.product === body.productId)!
    if (typeof product.minimumOrder === 'number' && line.quantity < product.minimumOrder) {
      return Response.json(
        { ok: false, reason: 'belowMinimumOrder', min: product.minimumOrder },
        { status: 400 },
      )
    }

    const updated = await req.payload.update({ collection: 'carts', id: cart.id, data: { items }, depth: 0 })
    const count = (updated.items ?? []).reduce((sum, it) => sum + it.quantity, 0)
    return Response.json({ ok: true, cartId: updated.id, count }, { status: 200 })
  },
}
