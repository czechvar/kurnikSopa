import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, setTestSiteSettings } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails, capturedEmails } from '../../setup/email-spy'
import { requestAccess, sendInvitation, acceptInvitation } from '@/lib/users/invitations'

describe('access requests and invitations', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
    resetEmails()
  })

  it('an access request creates a requested user with an unknown password and emails requester + staff', async () => {
    const payload = await getTestPayload()
    const result = await requestAccess(payload, {
      firstName: 'Petr', lastName: 'Novák', email: 'Petr@Example.com', phone: '777 000 000',
      message: 'Bral bych kuřata v září.', locale: 'cs',
    })
    expect(result.created).toBe(true)

    const user = (await payload.find({ collection: 'users', limit: 1 })).docs[0]
    expect(user.email).toBe('petr@example.com')
    expect(user.status).toBe('requested')
    expect(user.role).toBe('customer')
    expect(user.requestMessage).toContain('kuřata')

    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails[0].to).toBe('petr@example.com')
    expect(capturedEmails[1].to).toBe('staff@kurnik-sopa.cz')
    expect(capturedEmails[1].html).toContain('Petr Novák')
    expect(capturedEmails[1].html).toContain(`/admin/collections/users/${user.id}`)

    await expect(
      payload.login({ collection: 'users', data: { email: 'petr@example.com', password: 'anything-at-all' } }),
    ).rejects.toThrow()
  })

  it('a request for an email that already exists changes nothing and sends nothing', async () => {
    const payload = await getTestPayload()
    const existing = await createTestUser(payload, { email: 'known@example.com' })
    resetEmails()
    const result = await requestAccess(payload, {
      firstName: 'X', lastName: 'Y', email: 'KNOWN@example.com', phone: '1', locale: 'cs',
    })
    expect(result.created).toBe(false)
    expect(capturedEmails).toHaveLength(0)
    const fresh = await payload.findByID({ collection: 'users', id: existing.id })
    expect(fresh.status).toBe('active')
  })

  it('an invitation marks the user invited, emails a 7-day set-password link, and accepting it activates the account', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    await requestAccess(payload, { firstName: 'Eva', lastName: 'K', email: 'eva@example.com', phone: '2', locale: 'cs' })
    const requested = (await payload.find({ collection: 'users', where: { email: { equals: 'eva@example.com' } }, limit: 1 })).docs[0]
    resetEmails()

    const sent = await sendInvitation(payload, { userId: requested.id, invitedBy: staff.id, locale: 'cs' })
    expect(sent.sent).toBe(true)

    const invited = await payload.findByID({ collection: 'users', id: requested.id, depth: 0, showHiddenFields: true })
    expect(invited.status).toBe('invited')
    expect(invited.invitedAt).toBeTruthy()
    expect(invited.invitedBy).toBe(staff.id)
    const expiry = new Date((invited as unknown as { resetPasswordExpiration: string }).resetPasswordExpiration).getTime()
    expect(expiry - Date.now()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000)

    expect(capturedEmails).toHaveLength(1)
    const html = capturedEmails[0].html ?? ''
    expect(capturedEmails[0].to).toBe('eva@example.com')
    const match = html.match(/\/cs\/pozvanka\/([A-Za-z0-9]+)/)
    expect(match).not.toBeNull()
    const token = match![1]

    const accepted = await acceptInvitation(payload, { token, password: 'eva-password-123' })
    expect(accepted).toEqual({ ok: true, email: 'eva@example.com' })

    const active = await payload.findByID({ collection: 'users', id: requested.id, depth: 0 })
    expect(active.status).toBe('active')

    const login = await payload.login({ collection: 'users', data: { email: 'eva@example.com', password: 'eva-password-123' } })
    expect(login.user?.id).toBe(requested.id)
  })

  it('accepting with a bad token or a short password fails without changing anything', async () => {
    const payload = await getTestPayload()
    await requestAccess(payload, { firstName: 'A', lastName: 'B', email: 'ab@example.com', phone: '3', locale: 'cs' })
    expect(await acceptInvitation(payload, { token: 'nonsense', password: 'long-enough-pw' })).toEqual({ ok: false, reason: 'tokenInvalid' })
    expect(await acceptInvitation(payload, { token: 'nonsense', password: 'short' })).toEqual({ ok: false, reason: 'passwordTooShort' })
    const user = (await payload.find({ collection: 'users', where: { email: { equals: 'ab@example.com' } }, limit: 1 })).docs[0]
    expect(user.status).toBe('requested')
  })

  it('a blocked user is refused an invitation and cannot log in; unblocking restores login', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload, { email: 'blocked@example.com', password: 'blocked-password-1' })
    await payload.update({ collection: 'users', id: user.id, data: { status: 'blocked' } })

    expect(await sendInvitation(payload, { userId: user.id, invitedBy: null })).toEqual({ sent: false, reason: 'blocked' })
    await expect(
      payload.login({ collection: 'users', data: { email: 'blocked@example.com', password: 'blocked-password-1' } }),
    ).rejects.toThrow(/accountBlocked/)

    await payload.update({ collection: 'users', id: user.id, data: { status: 'active' } })
    const login = await payload.login({ collection: 'users', data: { email: 'blocked@example.com', password: 'blocked-password-1' } })
    expect(login.user?.id).toBe(user.id)
  })

  it('ticking "send invitation" in the admin sends the email and never stores the flag', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    await requestAccess(payload, { firstName: 'Tick', lastName: 'Box', email: 'tick@example.com', phone: '4', locale: 'cs' })
    const requested = (await payload.find({ collection: 'users', where: { email: { equals: 'tick@example.com' } }, limit: 1 })).docs[0]
    resetEmails()

    const saved = await payload.update({
      collection: 'users',
      id: requested.id,
      data: { sendInvitation: true },
      user: admin,
      overrideAccess: false,
    })
    expect(saved.sendInvitation).toBe(false)
    expect(capturedEmails).toHaveLength(1)
    expect(capturedEmails[0].html).toContain('/cs/pozvanka/')
    const fresh = await payload.findByID({ collection: 'users', id: requested.id, depth: 0 })
    expect(fresh.status).toBe('invited')
    expect(fresh.sendInvitation).toBe(false)
  })
})
