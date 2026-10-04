import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

const FORBIDDEN = { status: 403 }

async function seedPosts() {
  const payload = await getTestPayload()
  const draft = await payload.create({
    collection: 'posts',
    locale: 'cs',
    data: { title: 'Rozepsaný', slug: 'rozepsany' } as any,
  })
  const published = await payload.create({
    collection: 'posts',
    locale: 'cs',
    data: { title: 'Vydaný', slug: 'vydany', _status: 'published' } as any,
  })
  return { payload, draft, published }
}

describe('post drafts', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a new post is a draft until it is published', async () => {
    const { draft, published } = await seedPosts()
    expect((draft as any)._status).toBe('draft')
    expect((published as any)._status).toBe('published')
  })

  it('anonymous callers see published posts only', async () => {
    const { payload } = await seedPosts()
    const result = await payload.find({ collection: 'posts', overrideAccess: false })
    expect(result.docs.map((p) => p.slug)).toEqual(['vydany'])
  })

  it('a customer sees published posts only, even when asking for drafts', async () => {
    const { payload } = await seedPosts()
    const customer = await createTestUser(payload, { role: 'customer' })
    const result = await payload.find({
      collection: 'posts',
      draft: true,
      user: customer,
      overrideAccess: false,
    })
    expect(result.docs.map((p) => p.slug)).toEqual(['vydany'])
  })

  it('an editor sees drafts', async () => {
    const { payload } = await seedPosts()
    const editor = await createTestUser(payload, { role: 'editor' })
    const result = await payload.find({
      collection: 'posts',
      draft: true,
      user: editor,
      overrideAccess: false,
      sort: 'slug',
    })
    expect(result.docs.map((p) => p.slug)).toEqual(['rozepsany', 'vydany'])
  })

  // Unpublished edits to a published post live only in the versions table.
  it('a customer cannot read post versions; an editor can', async () => {
    const { payload } = await seedPosts()
    const customer = await createTestUser(payload, { role: 'customer' })
    const editor = await createTestUser(payload, { role: 'editor' })
    await expect(
      payload.findVersions({ collection: 'posts', user: customer, overrideAccess: false }),
    ).rejects.toMatchObject(FORBIDDEN)
    const versions = await payload.findVersions({
      collection: 'posts',
      user: editor,
      overrideAccess: false,
    })
    expect(versions.docs.length).toBeGreaterThan(0)
  })

  it('an unpublished edit does not change what the public reads', async () => {
    const { payload, published } = await seedPosts()
    await payload.update({
      collection: 'posts',
      id: published.id,
      locale: 'cs',
      draft: true,
      data: { title: 'Vydaný — rozpracovaná úprava', _status: 'draft' } as any,
    })
    const result = await payload.find({ collection: 'posts', locale: 'cs', overrideAccess: false })
    expect(result.docs.map((p) => p.title)).toEqual(['Vydaný'])
  })
})
