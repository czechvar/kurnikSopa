'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type BatchOption = {
  id: number
  label: string
  status: 'planned' | 'open'
  remaining: number
  deadlineLabel: string | null
  note: string | null
  pickupDays: Array<{ index: number; label: string }>
}

type Props = {
  product: { id: number; name: string; price: number; averageWeight: number | null; weightRange: string | null; minimumOrder: number }
  batches: BatchOption[]
  user: { firstName: string; lastName: string; phone: string; email: string } | null
  locale: 'cs' | 'en'
}

type BookResponse = { ok: boolean; orderNumber?: string; accessToken?: string; reason?: string; min?: number }

/**
 * Booking a batch product (glossary: Booking). The customer picks a batch,
 * a quantity in pieces, and, when the batch is already open, a pickup day.
 * Guests give their contact details here; there is no cart in this path.
 */
export function BatchBookingForm({ product, batches, user, locale }: Props) {
  const t = useTranslations('booking')
  const router = useRouter()
  const isGuest = user === null
  const minimum = Math.max(1, product.minimumOrder)

  const firstOpen = batches.find(b => b.status === 'open' && b.remaining > 0)
  const firstAvailable = firstOpen ?? batches.find(b => b.remaining > 0) ?? batches[0] ?? null

  const [batchId, setBatchId] = useState<number | null>(firstAvailable?.id ?? null)
  const [qty, setQty] = useState(minimum)
  const [dayIndex, setDayIndex] = useState<number | null>(null)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [note, setNote] = useState('')
  const [agreement, setAgreement] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const batch = useMemo(() => batches.find(b => b.id === batchId) ?? null, [batches, batchId])
  const estimatePerPiece = product.averageWeight ? Math.round(product.averageWeight * product.price) : null
  const estimate = estimatePerPiece ? estimatePerPiece * qty : null

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!batch) e.batch = 'batchRequired'
    if (batch && batch.remaining < qty) e.quantity = 'batchFull'
    if (batch?.status === 'open' && dayIndex === null) e.pickupDay = 'pickupDayRequired'
    if (!firstName.trim()) e.firstName = 'required'
    if (!lastName.trim()) e.lastName = 'required'
    if (!phone.trim()) e.phone = 'required'
    if (isGuest) {
      if (!email.trim()) e.email = 'guestEmailRequired'
      else if (!EMAIL_RE.test(email.trim())) e.email = 'emailInvalid'
    }
    if (!agreement) e.agreement = 'agreementRequired'
    return e
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0 || !batch) return
    start(async () => {
      let json: BookResponse
      try {
        const res = await fetch('/api/orders/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            batchId: batch.id,
            quantity: qty,
            pickupDayIndex: batch.status === 'open' ? dayIndex : null,
            customer: { firstName, lastName, phone, email: isGuest ? email.trim() : undefined },
            customerNote: note || undefined,
            locale,
          }),
        })
        json = (await res.json()) as BookResponse
      } catch {
        json = { ok: false }
      }
      if (!json.ok || !json.orderNumber || !json.accessToken) {
        const key = json.reason && ['batchFull', 'batchNotBookable', 'pickupDayRequired', 'belowMinimumOrder', 'guestEmailRequired', 'accountNotActive'].includes(json.reason) ? json.reason : 'generic'
        toast.error(t(`errors.${key}` as never, { min: json.min ?? minimum }))
        return
      }
      router.push({ pathname: '/pokladna/dekujeme/[orderNumber]', params: { orderNumber: json.orderNumber }, query: { t: json.accessToken } })
    })
  }

  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}` as never, { min: minimum }) : null)
  const input = 'w-full rounded border border-line bg-ground px-3 py-2 text-ink focus:border-ink focus:outline-none'

  if (batches.length === 0) {
    return <p role="status" className="rounded border border-line bg-ground-sunken p-3 text-sm font-semibold text-ink">{t('noBatches')}</p>
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-md border border-line bg-ground p-5">
      <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>

      <fieldset className="space-y-2">
        <legend className="mb-1 block text-sm font-medium">{t('chooseBatch')}</legend>
        {batches.map(b => {
          const full = b.remaining <= 0
          return (
            <label key={b.id} className={`flex items-start gap-3 rounded border p-3 ${full ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${batchId === b.id ? 'border-ink bg-ground-sunken' : 'border-line'}`}>
              <input type="radio" name="batch" disabled={full} checked={batchId === b.id} onChange={() => { setBatchId(b.id); setDayIndex(null) }} className="mt-1" />
              <span className="text-sm">
                <span className="block font-semibold text-ink">{b.label}</span>
                <span className="block text-ink-muted">
                  {b.status === 'open' && b.deadlineLabel ? t('openUntil', { date: b.deadlineLabel }) : t('planned')}
                  {' · '}
                  {full ? t('full') : t('remaining', { count: b.remaining })}
                </span>
                {b.note && <span className="block whitespace-pre-line text-ink-muted">{b.note}</span>}
              </span>
            </label>
          )
        })}
        {err('batch') && <p className="text-xs text-red-700">{err('batch')}</p>}
      </fieldset>

      {batch?.status === 'open' && (
        <fieldset className="space-y-2">
          <legend className="mb-1 block text-sm font-medium">{t('pickupDay')}</legend>
          {batch.pickupDays.map(d => (
            <label key={d.index} className={`flex cursor-pointer items-center gap-3 rounded border p-3 ${dayIndex === d.index ? 'border-ink bg-ground-sunken' : 'border-line'}`}>
              <input type="radio" name="pickupDay" checked={dayIndex === d.index} onChange={() => setDayIndex(d.index)} />
              <span className="text-sm">{d.label}</span>
            </label>
          ))}
          {err('pickupDay') && <p className="text-xs text-red-700">{err('pickupDay')}</p>}
        </fieldset>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium">{t('quantity')}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded border-2 border-ink">
            <button type="button" onClick={() => setQty(Math.max(minimum, qty - 1))} disabled={qty <= minimum} aria-label={t('quantity')} className="h-10 w-10 disabled:opacity-30">−</button>
            <span className="w-10 text-center" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty(qty + 1)} aria-label={t('quantity')} className="h-10 w-10">+</button>
          </div>
          {estimate !== null && product.averageWeight && (
            <span className="text-sm text-ink-muted">
              {t('estimate', { amount: formatPrice(estimate), weight: String(product.averageWeight * qty).replace('.', locale === 'cs' ? ',' : '.'), price: formatPrice(product.price) })}
            </span>
          )}
        </div>
        {err('quantity') && <p className="text-xs text-red-700">{err('quantity')}</p>}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{t('contact')}</p>
        {isGuest && <p className="text-sm text-ink-muted">{t('guestHint')} <Link href="/prihlaseni" className="underline underline-offset-4">{t('login')}</Link></p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm">{t('fields.firstName')}</span><input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" className={input} />{err('firstName') && <span className="text-xs text-red-700">{err('firstName')}</span>}</label>
          <label className="block"><span className="mb-1 block text-sm">{t('fields.lastName')}</span><input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" className={input} />{err('lastName') && <span className="text-xs text-red-700">{err('lastName')}</span>}</label>
          <label className="block"><span className="mb-1 block text-sm">{t('fields.phone')}</span><input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" className={input} />{err('phone') && <span className="text-xs text-red-700">{err('phone')}</span>}</label>
          <label className="block">
            <span className="mb-1 block text-sm">{t('fields.email')}</span>
            {isGuest ? <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={input} /> : <input value={email} readOnly className={`${input} bg-ground-sunken`} />}
            {err('email') && <span className="text-xs text-red-700">{err('email')}</span>}
          </label>
        </div>
        <label className="block"><span className="mb-1 block text-sm">{t('fields.note')}</span><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className={input} /></label>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={agreement} onChange={e => setAgreement(e.target.checked)} className="mt-1" />
        <span className="text-sm" dangerouslySetInnerHTML={{ __html: t.raw('agreement') as string }} />
      </label>
      {err('agreement') && <div className="-mt-3 text-xs text-red-700">{err('agreement')}</div>}

      <p className="text-sm text-ink-muted">{t('cashNote')}</p>
      <button type="submit" disabled={pending || !batch || batch.remaining <= 0} className={buttonClass('primary', 'lg', 'w-full')}>
        {pending ? '…' : batch?.status === 'open' ? t('submitOpen') : t('submitPlanned')}
      </button>
    </form>
  )
}
