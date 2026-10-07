'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { buttonClass } from '@/components/ui/button'

type Props = {
  orderNumber: string
  token: string | null
  pickupDays: Array<{ index: number; label: string }>
  currentPickupDayIndex: number | null
  quantity: number
  minimumOrder: number
  maxQuantity: number
  mode: 'confirm' | 'update' | 'cancelOnly'
}

type ApiResult = { ok: boolean; reason?: string; min?: number }

/** Confirm / change / cancel a booking. Works for guests through the order's access token. */
export function BookingActions({ orderNumber, token, pickupDays, currentPickupDayIndex, quantity, minimumOrder, maxQuantity, mode }: Props) {
  const t = useTranslations('bookingPanel')
  const router = useRouter()
  const [dayIndex, setDayIndex] = useState<number | null>(currentPickupDayIndex ?? (pickupDays.length === 1 ? pickupDays[0]!.index : null))
  const [qty, setQty] = useState(quantity)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [pending, start] = useTransition()

  async function call(path: string, body: Record<string, unknown>): Promise<ApiResult> {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...body, token: token ?? undefined }),
      })
      return (await res.json()) as ApiResult
    } catch {
      return { ok: false }
    }
  }

  function fail(r: ApiResult) {
    const key = r.reason && ['batchFull', 'notConfirmable', 'pickupDayInvalid', 'belowMinimumOrder', 'notCancellable'].includes(r.reason) ? r.reason : 'generic'
    toast.error(t(`errors.${key}` as never, { min: r.min ?? minimumOrder }))
  }

  function confirm() {
    if (dayIndex === null) { toast.error(t('errors.pickupDayRequired')); return }
    start(async () => {
      const r = await call('confirm', { pickupDayIndex: dayIndex, quantity: qty })
      if (!r.ok) { fail(r); return }
      toast.success(t(mode === 'confirm' ? 'confirmedToast' : 'updatedToast'))
      router.refresh()
    })
  }

  function cancel() {
    start(async () => {
      const r = await call('cancel', {})
      if (!r.ok) { fail(r); return }
      toast.success(t('cancelledToast'))
      setConfirmingCancel(false)
      router.refresh()
    })
  }

  const input = 'rounded border border-line bg-ground px-3 py-2 text-ink focus:border-ink focus:outline-none'

  return (
    <div className="space-y-4 border-t border-line pt-4">
      {mode !== 'cancelOnly' && (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-1 block text-sm font-medium">{t('pickupDay')}</legend>
            {pickupDays.map(d => (
              <label key={d.index} className={`flex cursor-pointer items-center gap-3 rounded border p-3 ${dayIndex === d.index ? 'border-ink bg-ground-sunken' : 'border-line'}`}>
                <input type="radio" name="pickupDay" checked={dayIndex === d.index} onChange={() => setDayIndex(d.index)} />
                <span>{d.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('quantity')}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQty(Math.max(minimumOrder, qty - 1))} disabled={pending || qty <= minimumOrder} aria-label={t('quantity')} className="h-10 w-10 rounded border-2 border-ink disabled:opacity-30">−</button>
              <input type="number" min={minimumOrder} max={maxQuantity} value={qty} onChange={e => setQty(Math.max(minimumOrder, Math.min(maxQuantity, Number(e.target.value) || minimumOrder)))} className={`${input} w-20 text-center`} />
              <button type="button" onClick={() => setQty(Math.min(maxQuantity, qty + 1))} disabled={pending || qty >= maxQuantity} aria-label={t('quantity')} className="h-10 w-10 rounded border-2 border-ink disabled:opacity-30">+</button>
              <span className="text-sm text-ink-muted">{t('maxHint', { max: maxQuantity })}</span>
            </div>
          </label>
          <button type="button" onClick={confirm} disabled={pending} className={buttonClass('primary', 'md', 'w-full')}>
            {mode === 'confirm' ? t('confirm') : t('update')}
          </button>
        </>
      )}
      {!confirmingCancel ? (
        <button type="button" onClick={() => setConfirmingCancel(true)} disabled={pending} className="text-sm text-red-700 underline underline-offset-4">
          {t('cancel')}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>{t('cancelConfirm')}</span>
          <button type="button" onClick={cancel} disabled={pending} className={buttonClass('outline', 'sm')}>{t('cancelYes')}</button>
          <button type="button" onClick={() => setConfirmingCancel(false)} disabled={pending} className="underline underline-offset-4">{t('cancelNo')}</button>
        </div>
      )}
    </div>
  )
}
