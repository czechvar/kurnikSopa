import { Client } from 'pg'

// Only list root tables — CASCADE handles child/join tables automatically.
// Verified against actual schema with \dt on 2026-05-18.
const TABLES = [
  'orders',
  'carts',
  'users',
  'products',
  'product_categories',
  'media',
  'posts',
  'post_categories',
  'authors',
  'events',
  'event_registrations',
  'pages',
]

let client: Client | null = null

async function getClient(): Promise<Client> {
  if (client) return client
  const uri = process.env.DATABASE_URI
  if (!uri) throw new Error('DATABASE_URI not set')
  client = new Client({ connectionString: uri })
  await client.connect()
  return client
}

export async function resetDb(): Promise<void> {
  const c = await getClient()
  const quoted = TABLES.map(t => `"${t}"`).join(', ')
  await c.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
}
