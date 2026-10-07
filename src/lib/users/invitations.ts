import { randomBytes } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import type { SiteSetting, User } from '@/payload-types'
import {
  accessRequestReceivedSubject,
  accessRequestReceivedTemplate,
  accessRequestStaffSubject,
  accessRequestStaffTemplate,
  invitationSubject,
  invitationTemplate,
} from '@/lib/email/templates'

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

type Locale = 'cs' | 'en'

export type AccessRequestInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  message?: string | null
  locale: Locale
}

/**
 * A visitor asks for an account (glossary: Access Request). The person lands
 * in the Users list as `requested` with a password nobody knows; the owner or
 * Staff turn it into an Invitation from the admin. An existing email is
 * silently ignored so the form never reveals who has an account.
 */
export async function requestAccess(payload: Payload, input: AccessRequestInput): Promise<{ created: boolean }> {
  const email = input.email.trim().toLowerCase()
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs.length > 0) return { created: false }

  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password: randomBytes(24).toString('base64url'),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      role: 'customer',
      status: 'requested',
      requestMessage: input.message?.trim() || undefined,
    },
    depth: 0,
  })

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  try {
    await payload.sendEmail({
      to: email,
      subject: accessRequestReceivedSubject(input.locale),
      html: accessRequestReceivedTemplate({ locale: input.locale, firstName: user.firstName ?? null, farmPhone: settings.contact?.phone ?? null }),
      replyTo: settings.contact?.email ?? undefined,
    } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`Failed to send access-request confirmation to ${email}: ${String(e)}`)
  }

  if (settings.notificationEmail) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      await payload.sendEmail({
        to: settings.notificationEmail,
        subject: accessRequestStaffSubject(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()),
        html: accessRequestStaffTemplate({
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          email,
          phone: user.phone ?? null,
          message: user.requestMessage ?? null,
          adminUrl: `${baseUrl}/admin/collections/users/${user.id}`,
        }),
        replyTo: email,
      } as Parameters<typeof payload.sendEmail>[0])
    } catch (e) {
      payload.logger.warn(`Failed to send access-request staff notification: ${String(e)}`)
    }
  }

  return { created: true }
}

/**
 * Send (or resend) an Invitation: a set-password link valid for seven days,
 * built on Payload's own password-reset token so no new token machinery is
 * needed. Following the link activates the account.
 */
export async function sendInvitation(
  payload: Payload,
  input: { userId: number; invitedBy: number | null; locale?: Locale },
  /** Pass the hook's request so nested writes share its transaction instead of waiting on it. */
  req?: PayloadRequest,
): Promise<{ sent: boolean; reason?: 'blocked' | 'notFound' }> {
  let user: User
  try {
    user = (await payload.findByID({ collection: 'users', id: input.userId, depth: 0, req })) as User
  } catch {
    return { sent: false, reason: 'notFound' }
  }
  if (user.status === 'blocked') return { sent: false, reason: 'blocked' }

  const token = await payload.forgotPassword({
    collection: 'users',
    data: { email: user.email },
    disableEmail: true,
    expiration: INVITATION_TTL_MS,
    req,
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      status: user.status === 'active' ? 'active' : 'invited',
      invitedAt: new Date().toISOString(),
      invitedBy: input.invitedBy ?? undefined,
    },
    depth: 0,
    req,
  })

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, req })) as SiteSetting
  const locale: Locale = input.locale ?? 'cs'
  let invitedByName: string | null = null
  if (input.invitedBy) {
    try {
      const inviter = (await payload.findByID({ collection: 'users', id: input.invitedBy, depth: 0, req })) as User
      invitedByName = inviter.firstName ?? null
    } catch {
      invitedByName = null
    }
  }

  await payload.sendEmail({
    to: user.email,
    subject: invitationSubject(locale),
    html: invitationTemplate({
      locale,
      token,
      firstName: user.firstName ?? null,
      invitedByName: invitedByName ?? settings.owner ?? null,
      farmPhone: settings.contact?.phone ?? null,
    }),
    replyTo: settings.contact?.email ?? undefined,
  } as Parameters<typeof payload.sendEmail>[0])

  return { sent: true }
}

/**
 * The invited person sets their password. The token proves they hold the
 * email, so the account becomes `active` in the same step.
 */
export async function acceptInvitation(
  payload: Payload,
  input: { token: string; password: string },
): Promise<{ ok: true; email: string } | { ok: false; reason: 'tokenInvalid' | 'passwordTooShort' }> {
  if (!input.password || input.password.length < 8) return { ok: false, reason: 'passwordTooShort' }
  if (!input.token) return { ok: false, reason: 'tokenInvalid' }

  // Resolve the token first: Payload's reset logs the person in at the end,
  // and the login hook refuses anything but an active account, so the account
  // has to be active before the reset runs.
  const found = await payload.find({
    collection: 'users',
    where: {
      and: [
        { resetPasswordToken: { equals: input.token } },
        { resetPasswordExpiration: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 1,
    depth: 0,
  })
  const pending = found.docs[0] as User | undefined
  if (!pending) return { ok: false, reason: 'tokenInvalid' }
  if (pending.status === 'blocked') return { ok: false, reason: 'tokenInvalid' }

  if (pending.status !== 'active') {
    await payload.update({ collection: 'users', id: pending.id, data: { status: 'active' }, depth: 0 })
  }

  try {
    await payload.resetPassword({
      collection: 'users',
      data: { token: input.token, password: input.password },
      overrideAccess: true,
    })
  } catch (e) {
    payload.logger.warn(`acceptInvitation: reset failed for user ${pending.id}: ${String(e)}`)
    if (pending.status !== 'active') {
      await payload.update({ collection: 'users', id: pending.id, data: { status: pending.status }, depth: 0 })
    }
    return { ok: false, reason: 'tokenInvalid' }
  }
  return { ok: true, email: pending.email }
}
