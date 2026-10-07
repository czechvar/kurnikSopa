import { timingSafeEqual } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runDailyBatchJobs } from '@/lib/batches/dailyRun'

export const dynamic = 'force-dynamic'

/**
 * Daily batch jobs: reminders, releasing unconfirmed bookings, closing
 * batches past their deadline. Vercel calls this on the schedule in
 * vercel.json with `Authorization: Bearer <CRON_SECRET>`; locally:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/batches
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ ok: false, reason: 'cronSecretMissing' }, { status: 503 })
  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }
  const payload = await getPayload({ config })
  const summary = await runDailyBatchJobs(payload)
  return Response.json({ ok: true, ...summary })
}
