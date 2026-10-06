import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestPost, createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import { publishedPostsWhere, publishedPostBySlugWhere } from '@/lib/posts/queries'

const NOW = new Date('2026-09-12T12:00:00.000Z')
const FAR_FUTURE = '2099-12-24T00:00:00.000Z'

async function slugsDue(now: Date) {
  const payload = await getTestPayload()
  const result = await payload.find({
    collection: 'posts',
    where: publishedPostsWhere(now),
    locale: 'cs',
  })
  return result.docs.map((d) => d.slug)
}

describe('published-and-due post filtering', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('includes a post published in the past', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'past', publishedAt: '2026-09-01T00:00:00.000Z' })
    expect(await slugsDue(NOW)).toContain('past')
  })

  it('includes a post dated exactly now', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'now', publishedAt: NOW.toISOString() })
    expect(await slugsDue(NOW)).toContain('now')
  })

  it('excludes a post scheduled for the future', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'future', publishedAt: '2026-12-24T00:00:00.000Z' })
    expect(await slugsDue(NOW)).not.toContain('future')
  })

  it('excludes a draft even when its date has passed', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, {
      slug: 'draft',
      status: 'draft',
      publishedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(await slugsDue(NOW)).not.toContain('draft')
  })

  it('finds a single due post by slug', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'wanted', publishedAt: '2026-09-01T00:00:00.000Z' })
    await createTestPost(payload, { slug: 'unwanted', publishedAt: '2026-09-01T00:00:00.000Z' })
    const result = await payload.find({
      collection: 'posts',
      where: publishedPostBySlugWhere('wanted', NOW),
      locale: 'cs',
      limit: 1,
    })
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]?.slug).toBe('wanted')
  })
})

describe('publishing and the date', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a post published without a date is dated now and is visible straight away', async () => {
    const payload = await getTestPayload()
    const before = Date.now()
    const post = await createTestPost(payload, { slug: 'undated', publishedAt: null })
    expect(post.publishedAt).toBeTruthy()
    expect(Date.parse(post.publishedAt as string)).toBeGreaterThanOrEqual(before - 1000)
    expect(await slugsDue(new Date())).toContain('undated')
  })

  it('publishing a draft through a partial update keeps its scheduled date', async () => {
    const payload = await getTestPayload()
    const draft = await createTestPost(payload, {
      slug: 'scheduled',
      status: 'draft',
      publishedAt: FAR_FUTURE,
    })
    const published = await payload.update({
      collection: 'posts',
      id: draft.id,
      locale: 'cs',
      data: { _status: 'published' } as any,
    })
    expect(published.publishedAt).toBe(FAR_FUTURE)
    expect(await slugsDue(new Date())).not.toContain('scheduled')
  })

  it('a scheduled post cannot be read through the API before its date', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'visible', publishedAt: '2026-01-01T00:00:00.000Z' })
    await createTestPost(payload, { slug: 'scheduled', publishedAt: FAR_FUTURE })
    const customer = await createTestUser(payload, { role: 'customer' })
    const anonymous = await payload.find({ collection: 'posts', overrideAccess: false })
    expect(anonymous.docs.map((p) => p.slug)).toEqual(['visible'])
    const asCustomer = await payload.find({
      collection: 'posts',
      user: customer,
      overrideAccess: false,
    })
    expect(asCustomer.docs.map((p) => p.slug)).toEqual(['visible'])
  })

  it('an editor still sees a scheduled post', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'scheduled', publishedAt: FAR_FUTURE })
    const editor = await createTestUser(payload, { role: 'editor' })
    const result = await payload.find({ collection: 'posts', user: editor, overrideAccess: false })
    expect(result.docs.map((p) => p.slug)).toEqual(['scheduled'])
  })
})
