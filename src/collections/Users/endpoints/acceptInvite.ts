import type { Endpoint, PayloadRequest } from 'payload'
import { acceptInvitation } from '@/lib/users/invitations'
import { allowRequest, clientKey } from '@/lib/users/rateLimit'

type Body = { token: string; password: string }

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  return typeof b.token === 'string' && b.token.length > 0 && typeof b.password === 'string'
}

/**
 * POST /api/users/accept-invite — the invited person sets a password.
 * Returns the email so the client can log in straight away.
 */
export const acceptInviteEndpoint: Endpoint = {
  path: '/accept-invite',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!allowRequest(`accept-invite:${clientKey(req.headers)}`, 20, 60 * 60 * 1000)) {
      return Response.json({ ok: false, reason: 'rateLimited' }, { status: 429 })
    }
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })

    const result = await acceptInvitation(req.payload, { token: body.token, password: body.password })
    if (!result.ok) return Response.json(result, { status: 400 })
    return Response.json(result, { status: 200 })
  },
}
