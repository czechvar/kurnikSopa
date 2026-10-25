import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestBatch, createTestPickupPoint, createTestProduct, createTestUser, setTestSiteSettings } from '../../helpers/factories'
import { loginCookie, rest } from '../../helpers/rest'
import { resetDb } from '../../setup/reset-db'
import { batchTranslations } from '@/lib/batches/messages'

type ErrorBody = { errors: Array<{ message: string; data?: { errors?: Array<{ path: string; message: string }> } }> }

/**
 * The admin saves a Batch with a REST PATCH and shows `errors[0].message` as
 * the toast; `data.errors[].path` marks the field. These go through that path.
 */
describe('batch rule errors as the admin sees them', () => {
  beforeEach(async () => {
    await resetDb()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  async function plannedBatchAndAdminCookie() {
    const payload = await getTestPayload()
    await createTestUser(payload, { role: 'admin', email: 'owner@example.com', password: 'owner-password-1' })
    const product = await createTestProduct(payload)
    const point = await createTestPickupPoint(payload)
    const batch = await createTestBatch(payload, product, { pickupDays: [{ date: '2027-08-28', pickupPoint: point }] })
    return { batch, cookie: await loginCookie('owner@example.com', 'owner-password-1') }
  }

  it('opening without a deadline answers with a Czech sentence and marks “Potvrdit do”', async () => {
    const { batch, cookie } = await plannedBatchAndAdminCookie()
    const res = await rest('PATCH', `/api/batches/${batch.id}`, { cookie, body: { status: 'open' } })
    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorBody
    expect(body.errors[0].message).toBe(batchTranslations.cs.batches.openNeedsDeadline)
    expect(body.errors[0].data?.errors).toEqual([
      { path: 'confirmationDeadline', message: batchTranslations.cs.batches.openNeedsDeadline },
    ])
  })

  it('an admin who switched the admin to English reads it in English', async () => {
    const { batch, cookie } = await plannedBatchAndAdminCookie()
    const res = await rest('PATCH', `/api/batches/${batch.id}`, { cookie: `${cookie}; payload-lng=en`, body: { status: 'open' } })
    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorBody
    expect(body.errors[0].message).toBe(batchTranslations.en.batches.openNeedsDeadline)
  })
})
