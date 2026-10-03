import { beforeEach, describe, expect, it } from 'vitest'
import type { CollectionSlug } from 'payload'
import { getTestPayload } from '../../helpers/payload'
import { createTestProduct, createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

const postData = (slug: string) => ({ title: `Post ${slug}`, slug }) as any

// Payload throws Forbidden with this message when collection access returns
// false. Matching it keeps a validation error from passing as a refusal.
const FORBIDDEN = /not allowed to perform this action/i

const EDITORIAL: CollectionSlug[] = ['posts', 'authors', 'post-categories', 'media']
const CATALOGUE: CollectionSlug[] = ['products', 'product-categories', 'events', 'pages']

describe('content collection access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  // Access is evaluated before field validation, so the payload here does not
  // need to be a valid document — a Forbidden proves the gate itself.
  it.each([...EDITORIAL, ...CATALOGUE])('a customer cannot create in %s', async (collection) => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.create({
        collection,
        locale: 'cs',
        data: { title: 'x', name: 'x', slug: 'x' } as any,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it.each(CATALOGUE)('an editor cannot create in %s', async (collection) => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    await expect(
      payload.create({
        collection,
        locale: 'cs',
        data: { title: 'x', name: 'x', slug: 'x' } as any,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('a customer cannot update or delete a post', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    const post = await payload.create({
      collection: 'posts',
      locale: 'cs',
      data: postData('victim'),
    })
    await expect(
      payload.update({
        collection: 'posts',
        id: post.id,
        locale: 'cs',
        data: { title: 'Defaced' } as any,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
    await expect(
      payload.delete({
        collection: 'posts',
        id: post.id,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('a customer cannot update or delete a product', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    const product = await createTestProduct(payload)
    await expect(
      payload.update({
        collection: 'products',
        id: product.id,
        locale: 'cs',
        data: { price: 1 } as any,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
    await expect(
      payload.delete({
        collection: 'products',
        id: product.id,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('an editor can create and delete a post', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const post = await payload.create({
      collection: 'posts',
      locale: 'cs',
      data: postData('editor-post'),
      user: editor,
      overrideAccess: false,
    })
    expect(post.slug).toBe('editor-post')
    await payload.delete({
      collection: 'posts',
      id: post.id,
      user: editor,
      overrideAccess: false,
    })
  })

  it('an editor can create an author and a post category', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const author = await payload.create({
      collection: 'authors',
      locale: 'cs',
      data: { name: 'Farmář Jan', slug: 'farmar-jan' } as any,
      user: editor,
      overrideAccess: false,
    })
    expect(author.name).toBe('Farmář Jan')
    const category = await payload.create({
      collection: 'post-categories',
      locale: 'cs',
      data: { name: 'Novinky', slug: 'novinky' } as any,
      user: editor,
      overrideAccess: false,
    })
    expect(category.name).toBe('Novinky')
  })

  it('an editor cannot change an order or read other users', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const customer = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.update({
        collection: 'orders',
        where: { id: { exists: true } },
        data: { orderStatus: 'shipped' } as any,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
    const users = await payload.find({
      collection: 'users',
      user: editor,
      overrideAccess: false,
    })
    expect(users.docs.map((u) => u.id)).toEqual([editor.id])
    expect(users.docs.map((u) => u.id)).not.toContain(customer.id)
  })

  // Globals and registrations sat on Payload's default too. Site settings hold
  // the bank account printed into every QR payment code and the address staff
  // order notifications go to.
  it.each(['customer', 'editor', 'staff'] as const)(
    'a %s cannot change site settings, navigation or footer',
    async (role) => {
      const payload = await getTestPayload()
      const user = await createTestUser(payload, { role })
      for (const slug of ['site-settings', 'navigation', 'footer'] as const) {
        await expect(
          payload.updateGlobal({
            slug,
            data: {} as any,
            user,
            overrideAccess: false,
          }),
        ).rejects.toThrow(FORBIDDEN)
      }
    },
  )

  it('a customer cannot read site settings through the API', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.findGlobal({ slug: 'site-settings', user: customer, overrideAccess: false }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('an admin can still change site settings', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    const updated = await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        owner: 'Nový majitel',
        payment: { bankName: 'KB', accountPrefix: '', accountNumber: '2901234567', bankCode: '2010' },
      } as any,
      user: admin,
      overrideAccess: false,
    })
    expect(updated.owner).toBe('Nový majitel')
  })

  it('a customer cannot read or create event registrations', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.find({ collection: 'event-registrations', user: customer, overrideAccess: false }),
    ).rejects.toThrow(FORBIDDEN)
    await expect(
      payload.create({
        collection: 'event-registrations',
        data: { guestName: 'x' } as any,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('staff gains no write access to posts', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    await expect(
      payload.create({
        collection: 'posts',
        locale: 'cs',
        data: postData('staff-post'),
        user: staff,
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('an anonymous caller can read posts and products', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'posts',
      locale: 'cs',
      data: postData('public-post'),
    })
    await createTestProduct(payload)
    const posts = await payload.find({ collection: 'posts', overrideAccess: false })
    expect(posts.docs.length).toBeGreaterThan(0)
    const products = await payload.find({ collection: 'products', overrideAccess: false })
    expect(products.docs.length).toBeGreaterThan(0)
  })
})
