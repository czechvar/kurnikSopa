import { describe, expect, it } from 'vitest'
import { focalPosition, populatedMedia, populatedMediaList } from '@/lib/media'

const photo = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  alt: `Fotka ${id}`,
  url: `/api/media/file/photo-${id}.jpg`,
  ...extra,
})

describe('populatedMedia', () => {
  it('returns a populated photo', () => {
    expect(populatedMedia(photo(1))).toEqual(photo(1))
  })

  // An unpopulated relation (depth 0) or an empty field must fall back to the
  // illustration rather than render a broken <img>.
  it.each([null, undefined, 7])('returns null for %s', (value) => {
    expect(populatedMedia(value)).toBeNull()
  })

  it('returns null for a photo with no file to show', () => {
    expect(populatedMedia({ id: 2, alt: 'Bez souboru', url: null, filename: null })).toBeNull()
  })
})

describe('populatedMediaList', () => {
  it('keeps the order set in the admin and drops what cannot be shown', () => {
    const list = [photo(3), 4, null, photo(1), { id: 5, alt: 'x', url: null, filename: null }, photo(2)]
    expect(populatedMediaList(list).map((m) => m.id)).toEqual([3, 1, 2])
  })

  it.each([null, undefined, []])('is empty for %s', (value) => {
    expect(populatedMediaList(value)).toEqual([])
  })
})

describe('focalPosition', () => {
  it('crops around the focal point set in the admin', () => {
    expect(focalPosition({ focalX: 30, focalY: 70 })).toBe('30% 70%')
  })

  it('centres a photo with no focal point', () => {
    expect(focalPosition({ focalX: null, focalY: undefined })).toBe('50% 50%')
  })
})
