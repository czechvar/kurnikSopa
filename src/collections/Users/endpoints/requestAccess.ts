import type { Endpoint, PayloadRequest } from 'payload'
import { requestAccess } from '@/lib/users/invitations'
import { allowRequest, clientKey } from '@/lib/users/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = {
  firstName: string
  lastName: string
  email: string
  phone: string
  message?: string
  locale: 'cs' | 'en'
}

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  return (
    typeof b.firstName === 'string' && b.firstName.trim().length > 0 &&
    typeof b.lastName === 'string' && b.lastName.trim().length > 0 &&
    typeof b.email === 'string' && EMAIL_RE.test(b.email.trim()) &&
    typeof b.phone === 'string' && b.phone.trim().length > 0 &&
    (b.message === undefined || (typeof b.message === 'string' && b.message.length <= 2000)) &&
    (b.locale === 'cs' || b.locale === 'en')
  )
}

/**
 * POST /api/users/request-access — a visitor asks for an account.
 * Always answers 200 for a valid body so the form never reveals which emails
 * already have an account.
 */
export const requestAccessEndpoint: Endpoint = {
  path: '/request-access',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!allowRequest(`request-access:${clientKey(req.headers)}`, 5, 60 * 60 * 1000)) {
      return Response.json({ ok: false, reason: 'rateLimited' }, { status: 429 })
    }
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })

    await requestAccess(req.payload, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      message: body.message,
      locale: body.locale,
    })
    return Response.json({ ok: true }, { status: 200 })
  },
}
