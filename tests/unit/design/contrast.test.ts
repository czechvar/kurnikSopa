import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The colour tokens are the single source of truth for text contrast, so the
// test reads them straight out of globals.css rather than duplicating values.
const css = readFileSync(path.resolve(__dirname, '../../../src/app/globals.css'), 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!match) throw new Error(`token --color-${name} not found as a hex value in globals.css`)
  return match[1]
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Every text-on-surface pair the design uses (spec §1). WCAG 2.1 AA, normal text.
const PAIRS: Array<[text: string, surface: string]> = [
  ['ink', 'ground'],
  ['ink', 'ground-sunken'],
  ['ink', 'panel-blush'],
  ['ink', 'panel-sage'],
  ['ink-muted', 'ground'],
  ['ink-muted', 'ground-sunken'],
  ['ink-muted', 'panel-blush'],
  ['ink-muted', 'panel-sage'],
  ['ink-deep', 'accent'],
  ['ground', 'ink'],
  ['ground', 'ink-deep'],
]

describe('colour tokens', () => {
  it.each(PAIRS)('%s on %s meets 4.5:1', (text, surface) => {
    expect(contrast(token(text), token(surface))).toBeGreaterThanOrEqual(4.5)
  })

  // Marigold is a fill, never a text colour. If someone wants accent-coloured
  // text, this test is where they find out why not.
  it('accent on ground is too faint for text', () => {
    expect(contrast(token('accent'), token('ground'))).toBeLessThan(4.5)
  })
})
