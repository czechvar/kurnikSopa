'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import type { Cart, Product } from '@/payload-types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type PickupPointOption = {
  id: number
  name: string
  street: string
  city: string
  zip: string
  note: string | null
  isFarm: boolean
}

type Props = {
  cart: Cart
  /** Null for a guest. */
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    phone: string
  } | null
  pickupPoints: PickupPointOption[]
  locale: 'cs' | 'en'
}

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

type PlaceResponse = {
  ok: boolean
  orderNumber?: string
  accessToken?: string
  errors?: Array<{ productName: string; code: string; min?: number }>
  reason?: string
}

export function CheckoutForm({ cart, user, pickupPoints, locale }: Props) {
  const t = useTranslations('checkout')
  const tCart = useTranslations('cart')
  const router = useRouter()

  const isGuest = user === null
  const defaultPoint = pickupPoints.find(p => p.isFarm) ?? pickupPoints[0] ?? null

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [pickupPointId, setPickupPointId] = useState<number | null>(defaultPoint?.id ?? null)
  const [preferredDate, setPreferredDate] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [agreement, setAgreement] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)

  const subtotal = (cart.items ?? []).reduce((sum, it) => {
    const p = it.product as Product | number
    return sum + (typeof p === 'object' ? p.price : 0) * it.quantity
  }, 0)

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'required'
    if (!lastName.trim())  e.lastName  = 'required'
    if (!phone.trim())     e.phone     = 'required'
    if (isGuest) {
      if (!email.trim()) e.email = 'guestEmailRequired'
      else if (!EMAIL_RE.test(email.trim())) e.email = 'emailInvalid'
    }
    if (pickupPointId === null) e.pickupPoint = 'pickupPointRequired'
    if (!preferredDate)    e.preferredDate = 'required'
    if (!agreement)        e.agreement = 'agreementRequired'
    return e
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    startTransition(async () => {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer: { firstName, lastName, phone, email: isGuest ? email.trim() : undefined },
          pickupPointId,
          preferredDate,
          customerNote: customerNote || undefined,
          locale,
        }),
      })
      const json = (await res.json()) as PlaceResponse
      if (!res.ok || !json.ok || !json.orderNumber || !json.accessToken) {
        if (json.errors && json.errors.length > 0) {
          for (const err of json.errors) {
            toast.error(t(`errors.${err.code}` as never, { name: err.productName, min: err.min ?? 0 }))
          }
        } else if (json.reason === 'pickupPointInvalid' || json.reason === 'guestEmailRequired' || json.reason === 'cartEmpty') {
          toast.error(t(`errors.${json.reason}`))
        } else {
          toast.error(t('errors.generic'))
        }
        return
      }
      router.refresh()
      router.push({
        pathname: '/pokladna/dekujeme/[orderNumber]',
        params: { orderNumber: json.orderNumber },
        query: { t: json.accessToken },
      })
    })
  }

  const err = (k: string) => errors[k] ? t(`errors.${errors[k]}` as never) : null
  const input = 'w-full rounded border border-line bg-ground px-3 py-2 text-ink focus:border-ink focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-md border border-line bg-ground p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">{tCart('summary.subtotal')}</h2>
        <ul className="space-y-2 text-sm">
          {(cart.items ?? []).map((it, idx) => {
            const p = it.product as Product
            const name = typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[locale]
            const price = (typeof p === 'object' ? p.price : 0) * it.quantity
            return (
              <li key={idx} className="flex justify-between">
                <span>{name} × {it.quantity}</span>
                <span>{formatCzk(price)}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-lg font-bold text-ink">
          <span>{tCart('summary.total')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
      </section>

      {isGuest && (
        <section className="rounded-md border border-line bg-ground-sunken p-4 text-sm text-ink">
          <p className="font-semibold">{t('guest.title')}</p>
          <p className="mt-1 text-ink-muted">{t('guest.hint')}</p>
          <p className="mt-2">
            {t('guest.haveAccount')}{' '}
            <Link href={{ pathname: '/prihlaseni', query: { next: locale === 'en' ? '/en/checkout' : '/cs/pokladna' } }} className="font-semibold underline underline-offset-4">
              {t('guest.login')}
            </Link>
          </p>
        </section>
      )}

      <section className="space-y-4 rounded-md border border-line bg-ground p-6">
        <h2 className="text-lg font-semibold text-ink">{t('sections.customer')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm">{t('fields.firstName')}</span>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" className={input} />
            {err('firstName') && <span className="text-xs text-red-700">{err('firstName')}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t('fields.lastName')}</span>
            <input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" className={input} />
            {err('lastName') && <span className="text-xs text-red-700">{err('lastName')}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t('fields.email')}</span>
            {isGuest ? (
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={input} />
            ) : (
              <input value={email} readOnly className={`${input} bg-ground-sunken`} />
            )}
            {err('email') && <span className="text-xs text-red-700">{err('email')}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t('fields.phone')}</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" className={input} />
            {err('phone') && <span className="text-xs text-red-700">{err('phone')}</span>}
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-line bg-ground p-6">
        <h2 className="text-lg font-semibold text-ink">{t('sections.pickup')}</h2>
        <p className="text-sm text-ink-muted">{t('pickup.intro')}</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">{t('fields.pickupPoint')}</legend>
          {pickupPoints.map(p => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${pickupPointId === p.id ? 'border-ink bg-ground-sunken' : 'border-line'}`}
            >
              <input
                type="radio"
                name="pickupPoint"
                checked={pickupPointId === p.id}
                onChange={() => setPickupPointId(p.id)}
                className="mt-1"
              />
              <span className="text-sm">
                <span className="block font-semibold text-ink">
                  {p.name}
                  {p.isFarm && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-ink-deep">{t('pickup.farm')}</span>}
                </span>
                <span className="block text-ink-muted">{p.street}, {p.zip} {p.city}</span>
                {p.note && <span className="block whitespace-pre-line text-ink-muted">{p.note}</span>}
              </span>
            </label>
          ))}
        </fieldset>
        {err('pickupPoint') && <div className="text-xs text-red-700">{err('pickupPoint')}</div>}

        <label className="block">
          <span className="mb-1 block text-sm">{t('fields.preferredDate')}</span>
          <input type="date" min={today} value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className={input} />
          {err('preferredDate') && <span className="text-xs text-red-700">{err('preferredDate')}</span>}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm">{t('fields.customerNote')}</span>
          <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} rows={3} className={input} />
        </label>
      </section>

      <section className="space-y-2 rounded-md border border-line bg-ground p-6">
        <h2 className="text-lg font-semibold text-ink">{t('sections.payment')}</h2>
        <p className="text-sm text-ink">{t('payment.cash')}</p>
      </section>

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={agreement} onChange={e => setAgreement(e.target.checked)} className="mt-1" />
        <span className="text-sm" dangerouslySetInnerHTML={{ __html: t.raw('fields.agreement') as string }} />
      </label>
      {err('agreement') && <div className="-mt-3 text-xs text-red-700">{err('agreement')}</div>}

      <button type="submit" disabled={submitting} className={buttonClass('primary', 'lg', 'w-full')}>
        {submitting ? '…' : t('submit')}
      </button>

      <Link href="/kosik" className="block text-center text-sm text-ink-muted underline">
        {tCart('cta.continueShopping')}
      </Link>
    </form>
  )
}
