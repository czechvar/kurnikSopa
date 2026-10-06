import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('Users access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a user can read their own User doc', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const result = await payload.find({
      collection: 'users',
      where: { id: { equals: user.id } },
      user,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(1)
  })

  it('a user cannot read another user’s doc', async () => {
    const payload = await getTestPayload()
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    const result = await payload.find({
      collection: 'users',
      where: { id: { equals: b.id } },
      user: a,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(0)
  })

  // Payload field-level access control (adminFieldOnly) silently strips
  // the forbidden field from the update payload instead of throwing.
  // We therefore verify the field is unchanged after the update attempt.

  it('a user cannot update their own role', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload, { role: 'customer' })
    const result = await payload.update({
      collection: 'users',
      id: user.id,
      data: { role: 'admin' } as any,
      user,
      overrideAccess: false,
    })
    expect(result.role).toBe('customer')
  })

  it('a user cannot update their own email', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const result = await payload.update({
      collection: 'users',
      id: user.id,
      data: { email: 'hijacked@kurnik-sopa.cz' } as any,
      user,
      overrideAccess: false,
    })
    expect(result.email).toBe(user.email)
  })

  it('an admin can update another user’s role', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    const target = await createTestUser(payload, { role: 'customer' })
    const result = await payload.update({
      collection: 'users',
      id: target.id,
      data: { role: 'staff' } as any,
      user: admin,
      overrideAccess: false,
    })
    expect(result.role).toBe('staff')
  })

  it('staff can read every user and set their status, but not their role', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    const target = await createTestUser(payload)
    const all = await payload.find({ collection: 'users', user: staff, overrideAccess: false })
    expect(all.docs).toHaveLength(2)

    const blocked = await payload.update({
      collection: 'users',
      id: target.id,
      data: { status: 'blocked', role: 'admin' } as any,
      user: staff,
      overrideAccess: false,
    })
    expect(blocked.status).toBe('blocked')
    expect(blocked.role).toBe('customer')
  })

  it('a customer cannot change their own status', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    await payload.update({ collection: 'users', id: user.id, data: { status: 'blocked' } })
    const result = await payload.update({
      collection: 'users',
      id: user.id,
      data: { status: 'active', firstName: 'Still' } as any,
      user,
      overrideAccess: false,
    })
    expect(result.status).toBe('blocked')
    expect(result.firstName).toBe('Still')
  })

  it('an editor sees no other users', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    await createTestUser(payload)
    const result = await payload.find({ collection: 'users', user: editor, overrideAccess: false })
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0].id).toBe(editor.id)
  })
})
