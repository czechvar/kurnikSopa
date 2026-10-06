import { describe, expect, it } from 'vitest'
import { fillPublishedAt } from '@/collections/Posts/hooks/fillPublishedAt'

const run = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  fillPublishedAt({ data, originalDoc } as any) as Record<string, unknown>

describe('fillPublishedAt', () => {
  it('fills the date when publishing without one', () => {
    const result = run({ _status: 'published' })
    expect(typeof result.publishedAt).toBe('string')
    expect(Number.isNaN(Date.parse(result.publishedAt as string))).toBe(false)
  })

  it('leaves an author-supplied date alone, including a future one', () => {
    const scheduled = '2026-12-24T00:00:00.000Z'
    expect(run({ _status: 'published', publishedAt: scheduled }).publishedAt).toBe(scheduled)
  })

  it('does not date a draft', () => {
    expect(run({ _status: 'draft' }).publishedAt).toBeUndefined()
  })

  // A partial update ({ _status: 'published' } alone) must not wipe a date the
  // author already saved on the draft.
  it('keeps the date already saved on the document', () => {
    const scheduled = '2026-12-24T00:00:00.000Z'
    const result = run({ _status: 'published' }, { publishedAt: scheduled })
    expect(result.publishedAt).toBeUndefined()
  })

  it('fills the date when the author explicitly clears it while publishing', () => {
    const result = run({ _status: 'published', publishedAt: null }, { publishedAt: '2026-01-01T00:00:00.000Z' })
    expect(typeof result.publishedAt).toBe('string')
  })
})
