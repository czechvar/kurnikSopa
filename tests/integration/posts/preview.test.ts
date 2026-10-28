import { beforeEach, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { getTestPayload } from '../../helpers/payload'
import { createTestPost, createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import { decidePreview, postPreviewPath } from '@/lib/posts/preview'
import { findPostBySlug } from '@/lib/posts/find-post'

const PASSWORD = 'test-password-min-8'

/** Request headers carrying the Payload admin session cookie for this role. */
async function sessionHeaders(
  payload: Payload,
  role: 'admin' | 'editor' | 'staff' | 'customer',
): Promise<Headers> {
  const user = await createTestUser(payload, { role, password: PASSWORD })
  const { token } = await payload.login({
    collection: 'users',
    data: { email: user.email, password: PASSWORD },
  })
  return new Headers({ cookie: `payload-token=${token}` })
}

const params = (query: string) => new URLSearchParams(query)

describe('preview gate', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('refuses a visitor with no admin session', async () => {
    const payload = await getTestPayload()
    const decision = await decidePreview(payload, {
      headers: new Headers(),
      searchParams: params('slug=rozepsany&locale=cs'),
    })
    expect(decision).toMatchObject({ ok: false, status: 401 })
  })

  it.each(['customer', 'staff'] as const)('refuses a signed-in %s', async (role) => {
    const payload = await getTestPayload()
    const decision = await decidePreview(payload, {
      headers: await sessionHeaders(payload, role),
      searchParams: params('slug=rozepsany&locale=cs'),
    })
    expect(decision).toMatchObject({ ok: false, status: 401 })
  })

  it('sends an editor to the post in the requested locale', async () => {
    const payload = await getTestPayload()
    const decision = await decidePreview(payload, {
      headers: await sessionHeaders(payload, 'editor'),
      searchParams: params('slug=rozepsany&locale=en'),
    })
    expect(decision).toEqual({ ok: true, redirectTo: '/en/blog/rozepsany' })
  })

  it('sends an admin to the Czech post when the locale is missing or unknown', async () => {
    const payload = await getTestPayload()
    const decision = await decidePreview(payload, {
      headers: await sessionHeaders(payload, 'admin'),
      searchParams: params('slug=rozepsany&locale=de'),
    })
    expect(decision).toEqual({ ok: true, redirectTo: '/cs/blog/rozepsany' })
  })

  it('rejects a request without a slug before checking the session', async () => {
    const payload = await getTestPayload()
    const decision = await decidePreview(payload, {
      headers: new Headers(),
      searchParams: params('locale=cs'),
    })
    expect(decision).toMatchObject({ ok: false, status: 400 })
  })

  // The redirect target is built from the query string, so it must stay a
  // path on this site whatever the slug contains.
  it('keeps the redirect on the blog whatever the slug contains', async () => {
    const payload = await getTestPayload()
    const decision = await decidePreview(payload, {
      headers: await sessionHeaders(payload, 'editor'),
      searchParams: params(`slug=${encodeURIComponent('//evil.example/x')}&locale=cs`),
    })
    expect(decision).toEqual({ ok: true, redirectTo: '/cs/blog/%2F%2Fevil.example%2Fx' })
  })
})

describe('admin preview link', () => {
  it('points at the preview route with the slug and locale', () => {
    expect(postPreviewPath({ slug: 'jarni-kuratka' }, 'en')).toBe(
      '/api/preview?slug=jarni-kuratka&locale=en',
    )
  })

  it('offers no link for a post that has no slug yet', () => {
    expect(postPreviewPath({ slug: '' }, 'cs')).toBeNull()
    expect(postPreviewPath({}, 'cs')).toBeNull()
  })
})

describe('findPostBySlug', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('hides a draft unless the page is in preview', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'rozepsany', title: 'Rozepsaný', status: 'draft' })

    expect(await findPostBySlug(payload, { slug: 'rozepsany', locale: 'cs', draft: false })).toBeNull()
    const preview = await findPostBySlug(payload, { slug: 'rozepsany', locale: 'cs', draft: true })
    expect(preview?.title).toBe('Rozepsaný')
  })

  it('hides a scheduled post unless the page is in preview', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, {
      slug: 'zitra',
      status: 'published',
      publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    expect(await findPostBySlug(payload, { slug: 'zitra', locale: 'cs', draft: false })).toBeNull()
    expect(await findPostBySlug(payload, { slug: 'zitra', locale: 'cs', draft: true })).not.toBeNull()
  })

  it('shows the published text to the public and the saved draft in preview', async () => {
    const payload = await getTestPayload()
    const post = await createTestPost(payload, { slug: 'vydany', title: 'Vydaný' })
    await payload.update({
      collection: 'posts',
      id: post.id,
      locale: 'cs',
      draft: true,
      data: { title: 'Vydaný — úprava', _status: 'draft' } as any,
    })

    const live = await findPostBySlug(payload, { slug: 'vydany', locale: 'cs', draft: false })
    const preview = await findPostBySlug(payload, { slug: 'vydany', locale: 'cs', draft: true })
    expect(live?.title).toBe('Vydaný')
    expect(preview?.title).toBe('Vydaný — úprava')
  })
})
