import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { allMigrationsApplied, expectedMigrationNames } from '../../../scripts/payload-cli.mjs'

describe('payload-cli wrapper', () => {
  it('reads every migration name the repo ships', () => {
    const source = readFileSync(path.resolve(__dirname, '../../../src/migrations/index.ts'), 'utf8')
    const names = expectedMigrationNames(source)
    expect(names.length).toBeGreaterThan(5)
    expect(names[0]).toBe('20260415_223941')
    expect(names).toContain('20261006_234107_batches')
  })

  it('accepts a database that has every expected migration, plus extras', () => {
    expect(allMigrationsApplied(['a', 'b'], ['a', 'b', 'c'])).toBe(true)
  })

  it('rejects a database missing an expected migration — the silent no-op case', () => {
    expect(allMigrationsApplied(['a', 'b'], [])).toBe(false)
    expect(allMigrationsApplied(['a', 'b'], ['a'])).toBe(false)
  })
})
