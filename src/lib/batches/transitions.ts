export type BatchStatus = 'planned' | 'open' | 'closed' | 'completed' | 'cancelled'

export type BatchShape = {
  status: BatchStatus
  capacity: number
  bookedCount?: number | null
  confirmationDeadline?: string | null
  pickupDays?: Array<{ date: string }> | null
}

export type BatchProblem =
  | 'openNeedsDeadline'
  | 'openNeedsPickupDays'
  | 'deadlineAfterPickup'
  | 'capacityBelowBooked'
  | 'completedOnlyFromClosed'

/**
 * What a Batch must satisfy to be saved, as a pure function so the rules are
 * unit-testable without a database. `previous` is null on create.
 */
export function validateBatch(next: BatchShape, previous: BatchShape | null): BatchProblem | null {
  const needsDates = next.status === 'open' || next.status === 'closed' || next.status === 'completed'
  if (needsDates) {
    if (!next.confirmationDeadline) return 'openNeedsDeadline'
    if (!next.pickupDays || next.pickupDays.length === 0) return 'openNeedsPickupDays'
    const deadline = new Date(next.confirmationDeadline).getTime()
    const earliest = Math.min(...next.pickupDays.map(d => new Date(d.date).getTime()))
    if (Number.isFinite(deadline) && Number.isFinite(earliest) && deadline > earliest) return 'deadlineAfterPickup'
  }
  if (typeof next.capacity === 'number' && (next.bookedCount ?? 0) > next.capacity) return 'capacityBelowBooked'
  if (next.status === 'completed' && previous && previous.status !== 'closed' && previous.status !== 'completed') {
    return 'completedOnlyFromClosed'
  }
  return null
}

/** Whether a customer may still confirm or change a booking on this batch at `now`. */
export function isConfirmationOpen(batch: { status: string; confirmationDeadline?: string | null }, now: Date = new Date()): boolean {
  if (batch.status !== 'open') return false
  if (!batch.confirmationDeadline) return false
  return new Date(batch.confirmationDeadline).getTime() >= now.getTime()
}
