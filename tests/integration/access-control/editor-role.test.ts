import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('editor role', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('can be assigned to a user', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    expect(editor.role).toBe('editor')
  })
})
