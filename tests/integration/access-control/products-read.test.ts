import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestProduct, createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

/**
 * Products use a plain `status` select rather than Payload drafts, so the
 * read rule has to hide drafts itself. Before this, /api/products returned
 * every draft to anonymous callers.
 */
describe('Products read access', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('anonymous and customer callers see only published products', async () => {
    const payload = await getTestPayload()
    await createTestProduct(payload, { status: 'published' })
    await createTestProduct(payload, { status: 'draft' })
    const customer = await createTestUser(payload)

    const anon = await payload.find({ collection: 'products', overrideAccess: false })
    expect(anon.docs).toHaveLength(1)
    expect(anon.docs[0].status).toBe('published')

    const asCustomer = await payload.find({ collection: 'products', overrideAccess: false, user: customer })
    expect(asCustomer.docs).toHaveLength(1)
  })

  it('admin and staff see drafts too', async () => {
    const payload = await getTestPayload()
    await createTestProduct(payload, { status: 'published' })
    await createTestProduct(payload, { status: 'draft' })
    const admin = await createTestUser(payload, { role: 'admin' })
    const staff = await createTestUser(payload, { role: 'staff' })

    expect((await payload.find({ collection: 'products', overrideAccess: false, user: admin })).docs).toHaveLength(2)
    expect((await payload.find({ collection: 'products', overrideAccess: false, user: staff })).docs).toHaveLength(2)
  })
})
