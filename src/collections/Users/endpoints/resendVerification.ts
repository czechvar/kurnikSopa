import crypto from 'crypto'
import type { Endpoint } from 'payload'
import { verifyEmailTemplate } from '@/lib/email/templates'

export const resendVerification: Endpoint = {
  path: '/resend-verification',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as { email?: string } | undefined
    const email = body?.email?.trim().toLowerCase()

    // Always return 200 — anti-enumeration. Never expose whether the email exists.
    if (!email) {
      return Response.json({ ok: true })
    }

    const { docs } = await req.payload.find({
      collection: 'users',
      where: {
        and: [
          { email: { equals: email } },
          { _verified: { equals: false } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const user = docs[0]
    if (!user) {
      return Response.json({ ok: true })
    }

    const newToken = crypto.randomBytes(20).toString('hex')

    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { _verificationToken: newToken } as never,
      overrideAccess: true,
      req,
    })

    const locale: 'cs' | 'en' = req.locale === 'en' ? 'en' : 'cs'
    const html = verifyEmailTemplate({
      locale,
      token: newToken,
      email: user.email,
      firstName: user.firstName ?? undefined,
    })

    await req.payload.sendEmail({
      to: user.email,
      subject: locale === 'en' ? 'Verify your email' : 'Ověřte svůj e-mail',
      html,
    })

    return Response.json({ ok: true })
  },
}
