#!/usr/bin/env node
/**
 * Runs `payload <script>` and checks that it actually did its job, retrying when
 * it did not.
 *
 * Why: payload's bin.js starts the CLI with an un-awaited `void start()` that goes
 * through tsx's `tsImport` loader. When that loader stalls, Node's event loop
 * drains and the process exits 0 after ~2 s without printing a line. Seen twice
 * in CI (runs 37533804622 and 37572743594): once `generate:types` wrote no file,
 * once `migrate` applied nothing and 80 integration tests failed with
 * `relation "orders" does not exist`.
 *
 * Usage: node scripts/payload-cli.mjs generate:types
 *        node scripts/payload-cli.mjs migrate
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ATTEMPTS = 3

/** Names of the migrations the repo ships, read from src/migrations/index.ts. */
export function expectedMigrationNames(indexSource) {
  return [...indexSource.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1])
}

/** True when every expected migration is recorded in payload_migrations. */
export function allMigrationsApplied(expected, applied) {
  const have = new Set(applied)
  return expected.every((name) => have.has(name))
}

async function appliedMigrationNames(databaseUri) {
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: databaseUri })
  await client.connect()
  try {
    const table = await client.query(`select to_regclass('public.payload_migrations') as t`)
    if (!table.rows[0]?.t) return []
    const rows = await client.query(`select name from payload_migrations`)
    return rows.rows.map((r) => r.name)
  } finally {
    await client.end()
  }
}

const CHECKS = {
  'generate:types': {
    // payload skips the write when the file already matches, so only presence
    // can be checked. That is the case that matters: the file is gitignored and
    // absent on a fresh CI runner or Vercel build.
    prepare: () => null,
    verify: async () => {
      try {
        return statSync(path.join(ROOT, 'src/payload-types.ts')).size > 0
      } catch {
        return false
      }
    },
    failure: 'src/payload-types.ts does not exist',
  },
  migrate: {
    prepare: () => expectedMigrationNames(readFileSync(path.join(ROOT, 'src/migrations/index.ts'), 'utf8')),
    verify: async (expected) => {
      const uri = process.env.DATABASE_URI
      if (!uri) throw new Error('DATABASE_URI is not set')
      return allMigrationsApplied(expected, await appliedMigrationNames(uri))
    },
    failure: 'payload_migrations is missing migrations that src/migrations/index.ts lists',
  },
}

export async function runVerified(script, args = []) {
  const check = CHECKS[script]
  if (!check) throw new Error(`payload-cli.mjs: no verification defined for "${script}"`)

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const context = check.prepare()
    const result = spawnSync('npx', ['payload', script, ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    })
    if (result.status !== 0) {
      throw new Error(`payload ${script} exited with ${result.status ?? result.signal}`)
    }
    if (await check.verify(context)) return

    console.error(
      `payload ${script} exited 0 but ${check.failure} (attempt ${attempt}/${ATTEMPTS}). ` +
        'This is the silent no-op of payload\'s tsx-based CLI entry point; retrying.',
    )
  }
  throw new Error(`payload ${script}: ${CHECKS[script].failure} after ${ATTEMPTS} attempts`)
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  const [script, ...args] = process.argv.slice(2)
  runVerified(script, args).catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
