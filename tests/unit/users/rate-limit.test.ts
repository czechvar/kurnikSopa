import { beforeEach, describe, expect, it } from 'vitest'
import { allowRequest, clientKey, resetRateLimits } from '@/lib/users/rateLimit'

describe('allowRequest', () => {
  beforeEach(() => resetRateLimits())

  it('allows up to the limit inside the window, then refuses', () => {
    const t0 = 1_000_000
    expect(allowRequest('k', 3, 1000, t0)).toBe(true)
    expect(allowRequest('k', 3, 1000, t0 + 10)).toBe(true)
    expect(allowRequest('k', 3, 1000, t0 + 20)).toBe(true)
    expect(allowRequest('k', 3, 1000, t0 + 30)).toBe(false)
  })

  it('forgets hits that fall out of the window', () => {
    const t0 = 1_000_000
    expect(allowRequest('k', 1, 1000, t0)).toBe(true)
    expect(allowRequest('k', 1, 1000, t0 + 500)).toBe(false)
    expect(allowRequest('k', 1, 1000, t0 + 1001)).toBe(true)
  })

  it('keys are independent', () => {
    expect(allowRequest('a', 1, 1000, 0)).toBe(true)
    expect(allowRequest('b', 1, 1000, 0)).toBe(true)
  })

  it('clientKey prefers the first forwarded address', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(clientKey(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
    expect(clientKey(new Headers())).toBe('unknown')
  })
})
