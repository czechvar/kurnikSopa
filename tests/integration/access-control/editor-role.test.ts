import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('editor role', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('can be assigned to a user', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    expect(editor.role).toBe('editor')
  })

  // Editors are created by an admin, not through the customer signup flow, so
  // they must not be left behind an unverified-email wall (same reasoning as
  // the existing admin/staff bypass).
  it('is auto-verified on create, like admin and staff', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const fresh = await payload.findByID({
      collection: 'users',
      id: editor.id,
      showHiddenFields: true,
    })
    expect((fresh as any)._verified).toBe(true)
  })

  it('leaves customers unverified', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    const fresh = await payload.findByID({
      collection: 'users',
      id: customer.id,
      showHiddenFields: true,
    })
    expect((fresh as any)._verified).toBeFalsy()
  })
})
