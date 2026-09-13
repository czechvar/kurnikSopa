import { describe, expect, it } from 'vitest'
import { clientUploadsEnabled } from '@/lib/uploads'

describe('clientUploadsEnabled', () => {
  it('is false when the variable is unset', () => {
    expect(clientUploadsEnabled({})).toBe(false)
  })

  it('is true for "true" and "1", case- and whitespace-insensitive', () => {
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'true' })).toBe(true)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'TRUE' })).toBe(true)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: ' 1 ' })).toBe(true)
  })

  it('is false for anything else', () => {
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'false' })).toBe(false)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'yes' })).toBe(false)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: '' })).toBe(false)
  })
})
