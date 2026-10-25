import { describe, expect, it } from 'vitest'
import { initI18n, type I18nOptions } from '@payloadcms/translations'
import { cs } from '@payloadcms/translations/languages/cs'
import { en } from '@payloadcms/translations/languages/en'
import { APIError } from 'payload'
import { validateBatch, type BatchProblem, type BatchShape } from '@/lib/batches/transitions'
import { batchProblemField, batchRuleError, batchTranslations, type BatchTFunction } from '@/lib/batches/messages'

const days = [{ date: '2027-08-28' }, { date: '2027-08-29' }]
const dated = { confirmationDeadline: '2027-08-20', pickupDays: days }

/** One save per rule, through the real rules, so a new rule without a message fails here. */
const brokenSaves: Array<{ rule: BatchProblem; next: BatchShape; previous: BatchShape | null }> = [
  { rule: 'openNeedsDeadline', next: { status: 'open', capacity: 50, pickupDays: days }, previous: { status: 'planned', capacity: 50 } },
  { rule: 'openNeedsPickupDays', next: { status: 'open', capacity: 50, confirmationDeadline: '2027-08-20' }, previous: { status: 'planned', capacity: 50 } },
  { rule: 'deadlineAfterPickup', next: { status: 'open', capacity: 50, confirmationDeadline: '2027-08-29', pickupDays: days }, previous: null },
  { rule: 'capacityBelowBooked', next: { status: 'planned', capacity: 5, bookedCount: 7 }, previous: null },
  { rule: 'completedOnlyFromClosed', next: { status: 'completed', capacity: 10, ...dated }, previous: { status: 'open', capacity: 10 } },
]

/** Payload's own `t`, built the way the server builds `req.t` from our i18n config. */
async function payloadT(language: 'cs' | 'en'): Promise<BatchTFunction> {
  const i18n = await initI18n({
    config: {
      fallbackLanguage: 'cs',
      supportedLanguages: { cs, en },
      // payload.config.ts passes exactly this. initI18n's own type expects
      // Payload's whole built-in set per language; Config['i18n'] does not.
      translations: batchTranslations as unknown as I18nOptions['translations'],
    },
    language,
    context: 'api',
  })
  return i18n.t as BatchTFunction
}

describe('batch rule errors', () => {
  it('cover every rule the transitions can break', () => {
    expect(brokenSaves.map(s => validateBatch(s.next, s.previous))).toEqual(brokenSaves.map(s => s.rule))
    expect(Object.keys(batchTranslations.cs.batches).sort()).toEqual(brokenSaves.map(s => s.rule).sort())
    expect(Object.keys(batchTranslations.en.batches).sort()).toEqual(brokenSaves.map(s => s.rule).sort())
  })

  for (const language of ['cs', 'en'] as const) {
    it(`are ${language} sentences, not raw keys, and name the field`, async () => {
      const t = await payloadT(language)
      for (const { rule, next, previous } of brokenSaves) {
        const problem = validateBatch(next, previous)!
        const error = batchRuleError(problem, t, { booked: next.bookedCount ?? 0 })

        expect(error).toBeInstanceOf(APIError)
        expect(error.status).toBe(400)
        expect(error.message).not.toContain(rule)
        expect(error.message).not.toContain('batches:')
        expect(error.message).not.toContain('{{')
        expect(error.message).not.toContain(':')
        expect(error.message).toMatch(/^\p{Lu}.*\.$/u)
        expect(error.data).toEqual({
          collection: 'batches',
          errors: [{ path: batchProblemField[rule], message: error.message }],
        })
      }
    })
  }

  it('reads Czech for a Czech admin and English for an English one', async () => {
    const [csT, enT] = await Promise.all([payloadT('cs'), payloadT('en')])
    expect(batchRuleError('openNeedsDeadline', csT).message).toContain('termín potvrzení')
    expect(batchRuleError('openNeedsDeadline', enT).message).toContain('confirmation deadline')
    expect(batchRuleError('capacityBelowBooked', csT, { booked: 7 }).message).toContain('(7 ks)')
    expect(batchRuleError('capacityBelowBooked', enT, { booked: 7 }).message).toContain('(7)')
  })
})
