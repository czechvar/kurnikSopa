import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import cs from '../../../messages/cs.json'
import en from '../../../messages/en.json'
import { routing } from '@/lib/i18n/routing'

/**
 * Every internal link embedded in a UI string (consent checkboxes, cookie
 * banner, …) must point at a route that exists. The privacy policy link was a
 * 404 for months because nothing checked this.
 */

const APP_DIR = path.resolve(__dirname, '../../../src/app/(frontend)/[locale]')

function collectHrefs(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/href=\\?"(\/(?:cs|en)\/[^"\\]*)\\?"/g)) {
      out.add(match[1])
    }
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) collectHrefs(child, out)
  }
}

/** Maps a localized public path back to the Czech route directory it is served from. */
function routeDirFor(href: string): string {
  const [, locale, ...rest] = href.split('/')
  const localized = '/' + rest.join('/')
  if (locale === 'en') {
    for (const entry of Object.values(routing.pathnames)) {
      if (typeof entry === 'object' && entry.en === localized) {
        return path.join(APP_DIR, entry.cs)
      }
    }
  }
  // Pages outside the pathname map (legal pages) share the Czech slug in both locales.
  return path.join(APP_DIR, localized)
}

describe('internal links in UI strings', () => {
  const hrefs = new Set<string>()
  collectHrefs(cs, hrefs)
  collectHrefs(en, hrefs)

  it('finds the consent links at all', () => {
    expect(hrefs.has('/cs/ochrana-osobnich-udaju')).toBe(true)
    expect(hrefs.has('/en/ochrana-osobnich-udaju')).toBe(true)
  })

  it.each([...hrefs])('%s resolves to a route', (href) => {
    const dir = routeDirFor(href)
    expect(existsSync(path.join(dir, 'page.tsx')), `${href} → ${dir}`).toBe(true)
  })
})
