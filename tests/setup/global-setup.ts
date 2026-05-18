import { Client } from 'pg'
import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.test') })

function parseDbName(uri: string): { adminUri: string; dbName: string } {
  const url = new URL(uri)
  const dbName = url.pathname.replace(/^\//, '')
  url.pathname = '/postgres'
  return { adminUri: url.toString(), dbName }
}

export default async function setup() {
  const uri = process.env.DATABASE_URI
  if (!uri) throw new Error('DATABASE_URI is not set — check .env.test')

  const { adminUri, dbName } = parseDbName(uri)

  // SAFETY GUARD — non-negotiable.
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". The DB name must end in "_test".`,
    )
  }

  const admin = new Client({ connectionString: adminUri })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
  await admin.query(`CREATE DATABASE "${dbName}"`)
  await admin.end()

  const result = spawnSync('npx', ['payload', 'migrate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URI: uri },
  })
  if (result.status !== 0) {
    throw new Error(`payload migrate failed with exit code ${result.status}`)
  }

  return async () => {
    const cleanup = new Client({ connectionString: adminUri })
    await cleanup.connect()
    await cleanup.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {})
    await cleanup.end()
  }
}
