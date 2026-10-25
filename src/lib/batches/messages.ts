import { APIError } from 'payload'
import type { DefaultTranslationKeys, NestedKeysStripped, TFunction } from '@payloadcms/translations'
import type { BatchProblem } from './transitions'

/**
 * What the owner reads when a Batch save breaks a rule. Registered with
 * Payload's admin i18n under `batches:` (see payload.config.ts), so the admin
 * toast follows the person's admin language. No colons: the admin toast splits
 * a message at the first colon into a heading and a field list.
 */
export const batchTranslations = {
  cs: {
    batches: {
      openNeedsDeadline: 'Vyplňte termín potvrzení (pole „Potvrdit do“). Bez něj nejde turnus otevřít ani uzavřít.',
      openNeedsPickupDays: 'Přidejte aspoň jeden den vyzvednutí (sekce „Dny vyzvednutí“). Bez něj nejde turnus otevřít ani uzavřít.',
      deadlineAfterPickup: 'Termín potvrzení (pole „Potvrdit do“) nesmí být později než první den vyzvednutí.',
      capacityBelowBooked: 'Kapacita nesmí být nižší než počet už rezervovaných kusů ({{booked}} ks).',
      completedOnlyFromClosed: 'Turnus jde označit jako „Proběhl“ až poté, co je „Uzavřený“.',
    } satisfies Record<BatchProblem, string>,
  },
  en: {
    batches: {
      openNeedsDeadline: 'Fill in the confirmation deadline (the “Confirm by” field). A batch cannot be opened or closed without it.',
      openNeedsPickupDays: 'Add at least one pickup day (the “Pickup days” section). A batch cannot be opened or closed without one.',
      deadlineAfterPickup: 'The confirmation deadline (the “Confirm by” field) cannot be later than the first pickup day.',
      capacityBelowBooked: 'Capacity cannot be lower than the units already booked ({{booked}}).',
      completedOnlyFromClosed: 'A batch can be marked “Completed” only once it is “Closed”.',
    } satisfies Record<BatchProblem, string>,
  },
}

type BatchTranslationKeys = NestedKeysStripped<typeof batchTranslations.en>

/** Payload's `req.t`, widened to know the `batches:` keys registered above. */
export type BatchTFunction = TFunction<BatchTranslationKeys | DefaultTranslationKeys>

/** The field each rule is about, so the admin marks it as well as showing the toast. */
export const batchProblemField: Record<BatchProblem, string> = {
  openNeedsDeadline: 'confirmationDeadline',
  openNeedsPickupDays: 'pickupDays',
  deadlineAfterPickup: 'confirmationDeadline',
  capacityBelowBooked: 'capacity',
  completedOnlyFromClosed: 'status',
}

/**
 * The error a Batch save throws for a broken rule: a 400 whose message is the
 * translated sentence (the admin shows it as the toast) and whose `data.errors`
 * names the field (the admin marks it red with the same sentence).
 */
export function batchRuleError(problem: BatchProblem, t: BatchTFunction, vars: { booked?: number } = {}): APIError {
  const message = t(`batches:${problem}`, { booked: vars.booked ?? 0 })
  return new APIError(message, 400, {
    collection: 'batches',
    errors: [{ path: batchProblemField[problem], message }],
  })
}
