import { describe, expect, it } from 'vitest'
import { Carts } from '@/collections/Carts'
import { pinCartOwner } from '@/collections/Carts/hooks/pinCartOwner'

const COOKIE = 'ks_cart=guest-token-abcdefghijklmnop'

function req(opts: { role?: string; id?: number; cookie?: string; api?: 'REST' | 'local' } = {}) {
  return {
    user: opts.role ? { role: opts.role, id: opts.id ?? 7 } : null,
    headers: new Headers(opts.cookie ? { cookie: opts.cookie } : {}),
    payloadAPI: opts.api ?? 'REST',
  } as any
}

const access = Carts.access!

describe('Carts access — who sees which cart', () => {
  it('a signed-in customer is scoped to their own cart', async () => {
    expect(await access.read!({ req: req({ role: 'customer', id: 42 }) } as any)).toEqual({ user: { equals: 42 } })
    expect(await access.update!({ req: req({ role: 'customer', id: 42 }) } as any)).toEqual({ user: { equals: 42 } })
  })

  it('a guest is scoped to the cart behind their cookie token, and sees nothing without one', async () => {
    expect(await access.read!({ req: req({ cookie: COOKIE }) } as any)).toEqual({ guestToken: { equals: 'guest-token-abcdefghijklmnop' } })
    expect(await access.update!({ req: req({ cookie: COOKIE }) } as any)).toEqual({ guestToken: { equals: 'guest-token-abcdefghijklmnop' } })
    expect(await access.read!({ req: req() } as any)).toBe(false)
    expect(await access.read!({ req: req({ cookie: 'ks_cart=short' }) } as any)).toBe(false)
  })

  it('admin sees and edits everything; staff only reads', async () => {
    expect(await access.read!({ req: req({ role: 'admin' }) } as any)).toBe(true)
    expect(await access.update!({ req: req({ role: 'admin' }) } as any)).toBe(true)
    expect(await access.read!({ req: req({ role: 'staff' }) } as any)).toBe(true)
    expect(await access.update!({ req: req({ role: 'staff' }) } as any)).toBe(false)
  })

  it('create needs a login or a guest token; delete is admin only', async () => {
    expect(await access.create!({ req: req({ role: 'customer' }) } as any)).toBe(true)
    expect(await access.create!({ req: req({ cookie: COOKIE }) } as any)).toBe(true)
    expect(await access.create!({ req: req() } as any)).toBe(false)
    expect(await access.delete!({ req: req({ role: 'admin' }) } as any)).toBe(true)
    expect(await access.delete!({ req: req({ role: 'customer' }) } as any)).toBe(false)
  })
})

describe('pinCartOwner — a cart belongs to whoever creates it', () => {
  const run = (data: Record<string, unknown>, r: unknown, operation: 'create' | 'update' = 'create') =>
    pinCartOwner({ data, req: r, operation } as any)

  it('pins a customer’s cart to their own id, whatever the body says', async () => {
    const out = await run({ user: 999, items: [] }, req({ role: 'customer', id: 42 }))
    expect(out).toMatchObject({ user: 42, guestToken: null })
  })

  it('pins a guest cart to the cookie token, ignoring a token in the body', async () => {
    const out = await run({ guestToken: 'somebody-elses-token-000000', items: [] }, req({ cookie: COOKIE }))
    expect(out).toMatchObject({ user: null, guestToken: 'guest-token-abcdefghijklmnop' })
  })

  it('refuses an anonymous create with no cookie token', async () => {
    await expect(run({ items: [] }, req())).rejects.toThrow()
  })

  it('leaves admin and Local API calls alone', async () => {
    expect(await run({ user: 999, items: [] }, req({ role: 'admin' }))).toEqual({ user: 999, items: [] })
    expect(await run({ user: 999, items: [] }, req({ api: 'local' }))).toEqual({ user: 999, items: [] })
  })

  it('on update, an items-only PATCH passes through for both kinds of owner', async () => {
    expect(await run({ items: [] }, req({ role: 'customer', id: 42 }), 'update')).toEqual({ items: [] })
    expect(await run({ items: [] }, req({ cookie: COOKIE }), 'update')).toEqual({ items: [] })
  })
})
