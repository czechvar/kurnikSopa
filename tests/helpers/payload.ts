import baseConfig from '@payload-config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import { emailSpyAdapter } from '../setup/email-spy'

let cached: Payload | null = null

export async function getTestPayload(): Promise<Payload> {
  if (cached) return cached
  const resolved = await baseConfig
  const config = { ...resolved, email: emailSpyAdapter() }
  cached = await getPayload({ config })
  return cached
}
