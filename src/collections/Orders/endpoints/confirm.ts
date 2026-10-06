import type { Endpoint, PayloadRequest } from 'payload'
import { findOrderForViewer } from '@/lib/orders/findOrderForViewer'
import { cancelBooking, confirmBooking } from '@/lib/orders/confirm'

async function readBody(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json?.()
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** The viewer must own the order (login) or hold its access token (guest link). */
async function viewerOrder(req: PayloadRequest, body: Record<string, unknown>) {
  const orderNumber = String(req.routeParams?.orderNumber ?? '')
  const token = typeof body.token === 'string' ? body.token : null
  if (!orderNumber) return null
  return findOrderForViewer(req.payload, { orderNumber, user: req.user ?? null, token })
}

/** POST /api/orders/:orderNumber/confirm — body { token?, pickupDayIndex, quantity? } */
export const confirmEndpoint: Endpoint = {
  path: '/:orderNumber/confirm',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const body = await readBody(req)
    if (!body || !Number.isInteger(body.pickupDayIndex)) return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    const order = await viewerOrder(req, body)
    if (!order) return Response.json({ ok: false, reason: 'notFound' }, { status: 404 })
    const quantity = body.quantity === undefined || body.quantity === null ? null : Number(body.quantity)
    const result = await confirmBooking(req.payload, { order, pickupDayIndex: body.pickupDayIndex as number, quantity })
    if (!result.ok) return Response.json(result, { status: result.reason === 'batchFull' ? 409 : 400 })
    return Response.json(result, { status: 200 })
  },
}

/** POST /api/orders/:orderNumber/cancel — body { token? } */
export const cancelEndpoint: Endpoint = {
  path: '/:orderNumber/cancel',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const body = (await readBody(req)) ?? {}
    const order = await viewerOrder(req, body)
    if (!order) return Response.json({ ok: false, reason: 'notFound' }, { status: 404 })
    const result = await cancelBooking(req.payload, order)
    if (!result.ok) return Response.json(result, { status: 400 })
    return Response.json(result, { status: 200 })
  },
}
