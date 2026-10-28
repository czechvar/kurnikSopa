import { describe, expect, it } from 'vitest'
import { describePublication, publicationStatus } from '@/lib/posts/publication-status'

const now = new Date('2026-10-25T12:00:00.000Z')
const tomorrowMorning = '2026-10-26T07:00:00.000Z' // 8:00 in Prague
const thisMorning = '2026-10-25T06:30:00.000Z' // 7:30 in Prague

describe('publicationStatus', () => {
  it('calls a saved draft a draft, whatever its date', () => {
    expect(publicationStatus({ _status: 'draft', publishedAt: null }, now)).toBe('draft')
    expect(publicationStatus({ _status: 'draft', publishedAt: tomorrowMorning }, now)).toBe('draft')
  })

  it('calls a published post with a future date scheduled', () => {
    expect(publicationStatus({ _status: 'published', publishedAt: tomorrowMorning }, now)).toBe(
      'scheduled',
    )
  })

  it('calls a published post whose date has come published', () => {
    expect(
      publicationStatus({ _status: 'published', publishedAt: '2026-10-25T12:00:00.000Z' }, now),
    ).toBe('published')
    expect(publicationStatus({ _status: 'published', publishedAt: null }, now)).toBe('published')
  })
})

describe('describePublication', () => {
  it('tells the editor in Czech when a scheduled post appears, in Prague time', () => {
    expect(describePublication({ _status: 'published', publishedAt: tomorrowMorning }, 'cs', now)).toBe(
      'Naplánováno: na webu se objeví 26. 10. 2026 v 8:00.',
    )
  })

  it('says a published post is live, and since when', () => {
    expect(describePublication({ _status: 'published', publishedAt: thisMorning }, 'cs', now)).toBe(
      'Ano, na webu od 25. 10. 2026 7:30.',
    )
  })

  it('says a draft version is not on the site', () => {
    expect(describePublication({ _status: 'draft', publishedAt: null }, 'cs', now)).toBe(
      'Ne, tato verze ještě není publikovaná.',
    )
  })

  it('speaks English to an editor using the admin in English', () => {
    expect(describePublication({ _status: 'published', publishedAt: tomorrowMorning }, 'en', now)).toBe(
      'Scheduled: appears on the site on 26/10/2026 at 08:00.',
    )
  })
})
