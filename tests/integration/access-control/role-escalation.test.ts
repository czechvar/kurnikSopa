import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

// Accounts are created by invitation (ADR 0002). The public create path is
// closed, and the `role` field is still the only thing standing between a
// staff-created customer and the admin panel.
describe('account creation and role escalation', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  const createAs = async (actor: Awaited<ReturnType<typeof createTestUser>> | null, role: string, email: string) => {
    const payload = await getTestPayload()
    return payload.create({
      collection: 'users',
      data: {
        email,
        password: 'attacker-password-min-8',
        firstName: 'Mallory',
        lastName: 'Attacker',
        role,
      } as any,
      user: actor ?? undefined,
      overrideAccess: false,
    })
  }

  it('an anonymous visitor cannot create an account once the site has users', async () => {
    const payload = await getTestPayload()
    await createTestUser(payload)
    await expect(createAs(null, 'customer', 'mallory@example.com')).rejects.toThrow()
  })

  it('a customer cannot create accounts either', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload)
    await expect(createAs(customer, 'customer', 'friend@example.com')).rejects.toThrow()
  })

  it('a staff member can create a customer but cannot hand out admin or staff', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    const created = await createAs(staff, 'admin', 'mallory-admin@example.com')
    expect(created.role).toBe('customer')
    expect(created.status).toBe('active')
  })

  it('an admin can still create another admin', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    const created = await createAs(admin, 'admin', 'second-admin@kurnik-sopa.cz')
    expect(created.role).toBe('admin')
  })

  it('the very first user may claim admin, so a fresh deployment can bootstrap', async () => {
    // resetDb leaves the users table empty — Payload's create-first-user
    // situation, where nobody is logged in yet.
    const first = await createAs(null, 'admin', 'founder@kurnik-sopa.cz')
    expect(first.role).toBe('admin')
  })
})
