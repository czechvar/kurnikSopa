import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

// Signup is public by design (customers register themselves), so the `role`
// field is the only thing standing between a stranger and the admin panel.
// Guarding `update` alone is not enough — the role has to be refused at create
// time too.
describe('role escalation through public signup', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  const signUpAs = async (role: string, email: string) => {
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
      overrideAccess: false,
    })
  }

  it('a public signup cannot claim the admin role', async () => {
    const payload = await getTestPayload()
    await createTestUser(payload) // the site already has users; not the bootstrap case

    const signup = await signUpAs('admin', 'mallory-admin@example.com')

    expect(signup.role).toBe('customer')
  })

  it('a public signup cannot claim the staff role', async () => {
    const payload = await getTestPayload()
    await createTestUser(payload)

    const signup = await signUpAs('staff', 'mallory-staff@example.com')

    expect(signup.role).toBe('customer')
  })

  it('a refused escalation does not skip email verification', async () => {
    const payload = await getTestPayload()
    await createTestUser(payload)

    const signup = await signUpAs('admin', 'mallory-verified@example.com')
    const fresh = await payload.findByID({
      collection: 'users',
      id: signup.id,
      showHiddenFields: true,
    })

    // The auto-verify hook keys off role. If an attacker could reach it, they
    // would land a usable account with no email round-trip.
    expect((fresh as any)._verified).toBeFalsy()
  })

  it('an admin can still create another admin', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })

    const created = await payload.create({
      collection: 'users',
      data: {
        email: 'second-admin@kurnik-sopa.cz',
        password: 'admin-password-min-8',
        firstName: 'Second',
        lastName: 'Admin',
        role: 'admin',
      } as any,
      user: admin,
      overrideAccess: false,
    })

    expect(created.role).toBe('admin')
  })

  it('the very first user may claim admin, so a fresh deployment can bootstrap', async () => {
    // resetDb leaves the users table empty — this is Payload's
    // create-first-user situation, where nobody is logged in yet.
    const first = await signUpAs('admin', 'founder@kurnik-sopa.cz')

    expect(first.role).toBe('admin')
  })
})
