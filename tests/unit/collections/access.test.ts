import { describe, expect, it } from 'vitest'
import { isAdmin, isAdminOrEditor, publicRead } from '@/collections/access'

const req = (role?: string) => ({ req: { user: role ? { role } : null } }) as any

describe('access predicates', () => {
  it('isAdmin admits only admins', () => {
    expect(isAdmin(req('admin'))).toBe(true)
    expect(isAdmin(req('editor'))).toBe(false)
    expect(isAdmin(req('staff'))).toBe(false)
    expect(isAdmin(req('customer'))).toBe(false)
    expect(isAdmin(req())).toBe(false)
  })

  it('isAdminOrEditor admits admins and editors only', () => {
    expect(isAdminOrEditor(req('admin'))).toBe(true)
    expect(isAdminOrEditor(req('editor'))).toBe(true)
    expect(isAdminOrEditor(req('staff'))).toBe(false)
    expect(isAdminOrEditor(req('customer'))).toBe(false)
    expect(isAdminOrEditor(req())).toBe(false)
  })

  it('publicRead admits anonymous callers', () => {
    expect(publicRead(req())).toBe(true)
  })
})
