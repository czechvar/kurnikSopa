import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, setTestSiteSettings } from '../../helpers/factories'
import { rest } from '../../helpers/rest'
import { resetDb } from '../../setup/reset-db'
import { capturedEmails, resetEmails } from '../../setup/email-spy'

/**
 * The reset email and its link follow the person's own language (User.locale),
 * not the page they happened to ask from. The storefront form sends its page
 * locale as `?locale=`, the same way these requests do.
 */
describe('password-reset email language', () => {
  beforeEach(async () => {
    await resetDb()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
    resetEmails()
  })

  async function requestReset(email: string, pageLocale: 'cs' | 'en') {
    const res = await rest('POST', `/api/users/forgot-password?locale=${pageLocale}`, { body: { email } })
    expect(res.status).toBe(200)
    const mail = capturedEmails.find(m => m.to === email)
    expect(mail).toBeDefined()
    return mail!
  }

  it('an English customer gets an English email and /en/reset-password/ link, even from a Czech page', async () => {
    const payload = await getTestPayload()
    await createTestUser(payload, { email: 'anna@example.com', locale: 'en' })
    resetEmails()

    const mail = await requestReset('anna@example.com', 'cs')

    expect(mail.subject).toBe('Reset your password')
    expect(mail.html).toContain('/en/reset-password/')
    expect(mail.html).not.toContain('/cs/obnova-hesla/')
  })

  it('a Czech customer gets a Czech email and /cs/obnova-hesla/ link, even from an English page', async () => {
    const payload = await getTestPayload()
    await createTestUser(payload, { email: 'petr@example.com', locale: 'cs' })
    resetEmails()

    const mail = await requestReset('petr@example.com', 'en')

    expect(mail.subject).toBe('Obnovení hesla')
    expect(mail.html).toContain('/cs/obnova-hesla/')
    expect(mail.html).not.toContain('/en/reset-password/')
  })
})
