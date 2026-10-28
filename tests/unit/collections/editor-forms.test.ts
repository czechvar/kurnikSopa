import { describe, expect, it } from 'vitest'
import type { CollectionConfig, Field } from 'payload'
import { Authors } from '@/collections/Authors'
import { Media } from '@/collections/Media'
import { PostCategories } from '@/collections/PostCategories'

type Localised = { cs?: string; en?: string }

function namedFields(fields: Field[]): Array<Field & { name: string }> {
  return fields.flatMap((field) => {
    const nested = 'fields' in field && Array.isArray(field.fields) ? namedFields(field.fields) : []
    return 'name' in field && field.name ? [field as Field & { name: string }, ...nested] : nested
  })
}

// The farm's editor works in a Czech admin and reaches these forms from a
// post: adding an author, a category or a photo.
describe.each([
  ['Authors', Authors],
  ['PostCategories', PostCategories],
  ['Media', Media],
] as Array<[string, CollectionConfig]>)('%s form', (_name, collection) => {
  it('labels every field in Czech and English', () => {
    for (const field of namedFields(collection.fields)) {
      const label = (field as { label?: Localised }).label
      expect(label?.cs, `${field.name} needs a Czech label`).toBeTruthy()
      expect(label?.en, `${field.name} needs an English label`).toBeTruthy()
    }
  })
})

describe('Media form', () => {
  it('explains the required image description instead of saying "Alt"', () => {
    const alt = namedFields(Media.fields).find((f) => f.name === 'alt')
    const admin = alt?.admin as { description?: Localised } | undefined
    expect(admin?.description?.cs).toBeTruthy()
  })

  // The filename column is the one Payload renders as a thumbnail, so the
  // picker shows photos rather than a list of URLs.
  it('lists photos with their thumbnail first', () => {
    expect(Media.admin?.defaultColumns?.[0]).toBe('filename')
  })
})
