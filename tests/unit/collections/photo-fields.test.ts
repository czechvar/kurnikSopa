import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'
import { Pages } from '@/collections/Pages'
import { SiteSettings } from '@/globals/SiteSettings'

type Localised = { cs?: string; en?: string }
type UploadField = Field & {
  name: string
  type: 'upload'
  relationTo: string
  hasMany?: boolean
  maxRows?: number
  label?: Localised
  admin?: { description?: Localised; condition?: (data: Record<string, unknown>) => boolean }
}

function findField(fields: Field[], path: string[]): Field | undefined {
  const [head, ...rest] = path
  const field = fields.find((f) => 'name' in f && f.name === head)
  if (!field || rest.length === 0) return field
  return 'fields' in field && Array.isArray(field.fields) ? findField(field.fields, rest) : undefined
}

function upload(fields: Field[], path: string[]): UploadField {
  const field = findField(fields, path)
  expect(field, `${path.join('.')} exists`).toBeDefined()
  expect(field?.type).toBe('upload')
  return field as UploadField
}

// The farm swaps the storefront photos itself in a Czech admin, so every
// photo field says in Czech where the photo shows and what happens without it.
describe.each([
  ['homepage hero', SiteSettings.fields, ['homepage', 'heroImage'], false],
  ['homepage gallery', SiteSettings.fields, ['homepage', 'gallery'], true],
  ['page cover', Pages.fields, ['heroImage'], false],
  ['page gallery', Pages.fields, ['gallery'], true],
] as Array<[string, Field[], string[], boolean]>)('%s field', (_name, fields, path, many) => {
  it('picks from the media library', () => {
    const field = upload(fields, path)
    expect(field.relationTo).toBe('media')
    expect(Boolean(field.hasMany)).toBe(many)
    if (many) expect(field.maxRows).toBeGreaterThan(0)
  })

  it('is labelled and explained in Czech and English', () => {
    const field = upload(fields, path)
    expect(field.label?.cs).toBeTruthy()
    expect(field.label?.en).toBeTruthy()
    expect(field.admin?.description?.cs).toBeTruthy()
    expect(field.admin?.description?.en).toBeTruthy()
  })
})

describe('page photo fields', () => {
  // Only the About page renders them; on other pages they would do nothing.
  it.each([['heroImage'], ['gallery']])('%s shows only on the About page', (name) => {
    const condition = upload(Pages.fields, [name]).admin?.condition
    expect(condition?.({ slug: 'o-nas' })).toBe(true)
    expect(condition?.({ slug: 'kontakt' })).toBe(false)
  })
})
