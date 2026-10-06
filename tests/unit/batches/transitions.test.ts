import { describe, expect, it } from 'vitest'
import { isConfirmationOpen, validateBatch } from '@/lib/batches/transitions'
import { heldUnits, isCounted, orderQuantity } from '@/lib/batches/capacity'

const days = [{ date: '2027-08-28' }, { date: '2027-08-29' }]

describe('validateBatch', () => {
  it('a planned batch needs nothing but a capacity', () => {
    expect(validateBatch({ status: 'planned', capacity: 50 }, null)).toBeNull()
  })

  it('opening requires a deadline and at least one pickup day', () => {
    expect(validateBatch({ status: 'open', capacity: 50, pickupDays: days }, { status: 'planned', capacity: 50 })).toBe('openNeedsDeadline')
    expect(validateBatch({ status: 'open', capacity: 50, confirmationDeadline: '2027-08-20' }, { status: 'planned', capacity: 50 })).toBe('openNeedsPickupDays')
    expect(validateBatch({ status: 'open', capacity: 50, confirmationDeadline: '2027-08-20', pickupDays: days }, { status: 'planned', capacity: 50 })).toBeNull()
  })

  it('the deadline must not fall after the first pickup day', () => {
    expect(validateBatch({ status: 'open', capacity: 50, confirmationDeadline: '2027-08-29', pickupDays: days }, null)).toBe('deadlineAfterPickup')
    expect(validateBatch({ status: 'open', capacity: 50, confirmationDeadline: '2027-08-28', pickupDays: days }, null)).toBeNull()
  })

  it('capacity cannot drop below what is already booked', () => {
    expect(validateBatch({ status: 'planned', capacity: 5, bookedCount: 7 }, null)).toBe('capacityBelowBooked')
  })

  it('completed only follows closed', () => {
    const dated = { capacity: 10, confirmationDeadline: '2027-08-20', pickupDays: days }
    expect(validateBatch({ status: 'completed', ...dated }, { status: 'open', capacity: 10 })).toBe('completedOnlyFromClosed')
    expect(validateBatch({ status: 'completed', ...dated }, { status: 'closed', capacity: 10 })).toBeNull()
  })
})

describe('isConfirmationOpen', () => {
  it('is true only for an open batch whose deadline has not passed', () => {
    const now = new Date('2027-08-15T12:00:00Z')
    expect(isConfirmationOpen({ status: 'open', confirmationDeadline: '2027-08-20' }, now)).toBe(true)
    expect(isConfirmationOpen({ status: 'open', confirmationDeadline: '2027-08-10' }, now)).toBe(false)
    expect(isConfirmationOpen({ status: 'planned', confirmationDeadline: '2027-08-20' }, now)).toBe(false)
    expect(isConfirmationOpen({ status: 'open', confirmationDeadline: null }, now)).toBe(false)
  })
})

describe('capacity helpers', () => {
  it('counts booked, confirmed, ready and picked-up orders; not released or cancelled', () => {
    for (const s of ['booked', 'confirmed', 'ready', 'picked_up']) expect(isCounted(s)).toBe(true)
    for (const s of ['released', 'cancelled', null, undefined]) expect(isCounted(s)).toBe(false)
  })

  it('sums quantities and zeroes units for orders that no longer count', () => {
    expect(orderQuantity([{ quantity: 2 }, { quantity: 3 }])).toBe(5)
    expect(heldUnits({ orderStatus: 'confirmed', items: [{ quantity: 4 }] })).toBe(4)
    expect(heldUnits({ orderStatus: 'released', items: [{ quantity: 4 }] })).toBe(0)
  })
})
