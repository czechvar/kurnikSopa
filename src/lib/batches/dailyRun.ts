import type { Payload } from 'payload'
import type { Batch, Order, SiteSetting } from '@/payload-types'
import {
  bookingReleasedSubject,
  bookingReleasedTemplate,
  confirmationReminderSubject,
  confirmationReminderTemplate,
} from '@/lib/email/templates'
import { formatDay, orderLink, orderLocale, orderRecipient } from '@/lib/orders/orderEmails'
import { pickupDaysFor } from './notifyOpened'

export const REMINDER_DAYS_BEFORE = 3

export type DailyRunSummary = { reminders: number; released: number; closed: number }

const DAY = 24 * 60 * 60 * 1000

function endOfDay(iso: string): number {
  const d = new Date(iso)
  d.setUTCHours(23, 59, 59, 999)
  return d.getTime()
}

/**
 * The once-a-day sweep behind /api/cron/batches. Idempotent: a second run on
 * the same day changes nothing.
 *
 * 1. Reminder: booked orders on open batches whose deadline is within three
 *    days get one reminder.
 * 2. Release: booked orders whose batch deadline has passed are released and
 *    their units freed (the Orders hooks keep bookedCount in step).
 * 3. Close: open batches past their deadline become closed.
 */
export async function runDailyBatchJobs(payload: Payload, now: Date = new Date()): Promise<DailyRunSummary> {
  const summary: DailyRunSummary = { reminders: 0, released: 0, closed: 0 }
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  const open = await payload.find({ collection: 'batches', where: { status: { equals: 'open' } }, depth: 0, limit: 200 })

  for (const batch of open.docs as Batch[]) {
    if (!batch.confirmationDeadline) continue
    const deadlineEnd = endOfDay(batch.confirmationDeadline)
    const past = now.getTime() > deadlineEnd
    const booked = await payload.find({
      collection: 'orders',
      where: { and: [{ batch: { equals: batch.id } }, { orderStatus: { equals: 'booked' } }] },
      depth: 0,
      limit: 500,
    })

    if (past) {
      for (const order of booked.docs as Order[]) {
        await payload.update({ collection: 'orders', id: order.id, data: { orderStatus: 'released' }, depth: 0 })
        summary.released += 1
        await sendReleased(payload, order, batch, settings)
      }
      await payload.update({ collection: 'batches', id: batch.id, data: { status: 'closed' }, depth: 0, context: { skipBatchValidation: true } })
      summary.closed += 1
      continue
    }

    const remindFrom = deadlineEnd - REMINDER_DAYS_BEFORE * DAY
    if (now.getTime() >= remindFrom) {
      for (const order of booked.docs as Order[]) {
        if (order.reminderSentAt) continue
        await sendReminder(payload, order, batch, settings)
        await payload.update({ collection: 'orders', id: order.id, data: { reminderSentAt: now.toISOString() }, depth: 0 })
        summary.reminders += 1
      }
    }
  }

  payload.logger.info(`daily batch run: ${summary.reminders} reminders, ${summary.released} released, ${summary.closed} closed`)
  return summary
}

async function sendReminder(payload: Payload, order: Order, batch: Batch, settings: SiteSetting): Promise<void> {
  const recipient = await orderRecipient(payload, order)
  if (!recipient) return
  const locale = orderLocale(order)
  const localized = (await payload.findByID({ collection: 'batches', id: batch.id, depth: 1, locale })) as Batch
  const input = {
    locale, orderNumber: String(order.orderNumber), customerFirstName: recipient.firstName,
    batchLabel: localized.label, pickupDays: pickupDaysFor(localized, locale),
    deadline: formatDay(batch.confirmationDeadline, locale), orderUrl: orderLink(order), farmPhone: settings.contact?.phone ?? null,
  }
  try {
    await payload.sendEmail({ to: recipient.to, subject: confirmationReminderSubject(input), html: confirmationReminderTemplate(input), replyTo: settings.contact?.email ?? undefined } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`reminder email failed for ${order.orderNumber}: ${String(e)}`)
  }
}

async function sendReleased(payload: Payload, order: Order, batch: Batch, settings: SiteSetting): Promise<void> {
  const recipient = await orderRecipient(payload, order)
  if (!recipient) return
  const locale = orderLocale(order)
  const localized = (await payload.findByID({ collection: 'batches', id: batch.id, depth: 0, locale })) as Batch
  const input = { locale, orderNumber: String(order.orderNumber), customerFirstName: recipient.firstName, batchLabel: localized.label, farmPhone: settings.contact?.phone ?? null }
  try {
    await payload.sendEmail({ to: recipient.to, subject: bookingReleasedSubject(input), html: bookingReleasedTemplate(input), replyTo: settings.contact?.email ?? undefined } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`released email failed for ${order.orderNumber}: ${String(e)}`)
  }
}
