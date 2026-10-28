import { describe, expect, it } from 'vitest'
import type { Field, Tab } from 'payload'
import { Posts } from '@/collections/Posts'

type Localised = { cs?: string; en?: string }

/**
 * Every data path the Posts form stores, as Payload sees it. Unnamed tabs,
 * rows and collapsibles are layout only and add no path segment; a named tab
 * or group does.
 */
function dataPaths(fields: Field[], prefix = ''): string[] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab: Tab) =>
        'name' in tab && tab.name
          ? dataPaths(tab.fields, `${prefix}${tab.name}.`)
          : dataPaths(tab.fields, prefix),
      )
    }
    if (field.type === 'row' || field.type === 'collapsible') {
      return dataPaths(field.fields, prefix)
    }
    if (field.type === 'group' && 'name' in field && field.name) {
      return dataPaths(field.fields, `${prefix}${field.name}.`)
    }
    // A virtual field is computed on read and never stored.
    if ('virtual' in field && field.virtual) return []
    return 'name' in field && field.name ? [`${prefix}${field.name}`] : []
  })
}

/** Every named field, at any depth, with the config Payload renders it from. */
function namedFields(fields: Field[]): Array<Field & { name: string }> {
  return fields.flatMap((field) => {
    const nested =
      field.type === 'tabs'
        ? field.tabs.flatMap((tab: Tab) => namedFields(tab.fields))
        : 'fields' in field && Array.isArray(field.fields)
          ? namedFields(field.fields)
          : []
    const self = 'name' in field && field.name ? [field as Field & { name: string }] : []
    return [...self, ...nested]
  })
}

const fieldNames = (fields: Field[]) =>
  fields.map((f) => ('name' in f ? f.name : f.type))

describe('Posts admin form', () => {
  it('keeps every stored path, so the tabs need no migration', () => {
    expect(dataPaths(Posts.fields).sort()).toEqual(
      [
        'author',
        'categories',
        'content',
        'coverImage',
        'excerpt',
        'publishedAt',
        'seo.metaDescription',
        'seo.metaImage',
        'seo.metaTitle',
        'slug',
        'title',
      ].sort(),
    )
  })

  it('groups the fields into Obsah, Zařazení and SEO tabs', () => {
    const tabsField = Posts.fields.find((f) => f.type === 'tabs')
    expect(tabsField, 'Posts should have a tabs field').toBeDefined()
    if (tabsField?.type !== 'tabs') return

    expect(tabsField.tabs.map((t) => (t.label as Localised).cs)).toEqual([
      'Obsah',
      'Zařazení',
      'SEO',
    ])
    expect(tabsField.tabs.map((t) => fieldNames(t.fields))).toEqual([
      ['title', 'slug', 'excerpt', 'content', 'coverImage'],
      ['author', 'categories'],
      ['seo'],
    ])
    // A named tab nests its fields under that name in the database.
    for (const tab of tabsField.tabs) {
      expect('name' in tab && tab.name).toBeFalsy()
    }
  })

  it('keeps publishedAt in the sidebar, outside the tabs', () => {
    const publishedAt = Posts.fields.find((f) => 'name' in f && f.name === 'publishedAt')
    expect(publishedAt?.admin?.position).toBe('sidebar')
  })

  // The picker's default is US order with a 12-hour clock ("říj 26, 2026 12:00 dop.").
  it('shows the publish date the Czech way, on a 24-hour clock', () => {
    const publishedAt = Posts.fields.find((f) => 'name' in f && f.name === 'publishedAt')
    if (publishedAt?.type !== 'date') throw new Error('publishedAt should be a date field')
    expect(publishedAt.admin?.date).toMatchObject({
      pickerAppearance: 'dayAndTime',
      displayFormat: 'd. M. yyyy H:mm',
      timeFormat: 'H:mm',
    })
  })

  // Payload says "Publikováno" for a scheduled post too; this line says what
  // the public actually sees.
  it('shows under the date whether the post is on the site, without storing it', () => {
    const names = Posts.fields.map((f) => ('name' in f ? f.name : f.type))
    expect(names.indexOf('onSite')).toBe(names.indexOf('publishedAt') + 1)
    const onSite = Posts.fields.find((f) => 'name' in f && f.name === 'onSite')
    expect(onSite).toMatchObject({
      virtual: true,
      admin: { position: 'sidebar', readOnly: true },
    })
  })

  it('labels every field in Czech and English', () => {
    for (const field of namedFields(Posts.fields)) {
      const label = (field as { label?: Localised }).label
      expect(label?.cs, `${field.name} needs a Czech label`).toBeTruthy()
      expect(label?.en, `${field.name} needs an English label`).toBeTruthy()
    }
  })

  it('explains every field the author fills in, in Czech', () => {
    const explained = [
      'title',
      'slug',
      'excerpt',
      'content',
      'coverImage',
      'author',
      'categories',
      'seo',
      'publishedAt',
    ]
    const byName = new Map(namedFields(Posts.fields).map((f) => [f.name, f]))
    for (const name of explained) {
      const admin = byName.get(name)?.admin as { description?: Localised } | undefined
      const description = admin?.description
      expect(description?.cs, `${name} needs a Czech description`).toBeTruthy()
    }
  })
})
