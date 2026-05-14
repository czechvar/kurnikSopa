import { getPayload } from '@/lib/payload'

export async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
}
