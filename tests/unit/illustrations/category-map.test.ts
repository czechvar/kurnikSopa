import { describe, expect, it } from 'vitest'
import { illustrationForCategory } from '@/components/illustrations/category-map'

describe('illustrationForCategory', () => {
  it.each([
    ['drubez', 'chicken'],
    ['vejce', 'eggs'],
    ['kralici', 'rabbit'],
    ['zelenina', 'vegetables'],
  ])('maps the seeded category %s to %s', (slug, name) => {
    expect(illustrationForCategory(slug)).toBe(name)
  })

  it('falls back to the hen for an unknown or missing category', () => {
    expect(illustrationForCategory('med')).toBe('hen')
    expect(illustrationForCategory(null)).toBe('hen')
    expect(illustrationForCategory(undefined)).toBe('hen')
  })
})
