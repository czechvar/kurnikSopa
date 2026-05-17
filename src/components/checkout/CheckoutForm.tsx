'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/routing'
import type { Cart, Product } from '@/payload-types'

const ZIP_RE = /^\d{3}\s?\d{2}$/

type Address = { street: string; city: string; zip: string; label?: string | null }

type Props = {
  cart: Cart
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    phone: string
    addresses: Array<Address & { id?: string | null }>
  }
  farm: { address: { street: string; city: string; zip: string }; phone: string | null; openingHours: string | null }
  bankConfigured: boolean
  locale: 'cs' | 'en'
}

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

export function CheckoutForm({ cart, user, farm, bankConfigured, locale }: Props) {
  const t = useTranslations('checkout')
  const tCart = useTranslations('cart')
  const router = useRouter()

  const defaultAddr = user.addresses[0] ?? null

  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [phone, setPhone] = useState(user.phone)
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [useOther, setUseOther] = useState(false)
  const [street, setStreet] = useState(defaultAddr?.street ?? '')
  const [city, setCity] = useState(defaultAddr?.city ?? '')
  const [zip, setZip] = useState(defaultAddr?.zip ?? '')
  const [preferredDate, setPreferredDate] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash_on_delivery'>('bank_transfer')
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
    if (!preferredDate)    e.preferredDate = 'required'
    if (!agreement)        e.agreement = 'agreementRequired'
    if (deliveryMethod === 'delivery') {
      if (!street.trim()) e.street = 'required'
      if (!city.trim())   e.city   = 'required'
      if (!zip.trim())    e.zip    = 'required'
      else if (!ZIP_RE.test(zip)) e.zip = 'zipInvalid'
    }
    return e
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    if (paymentMethod === 'bank_transfer' && !bankConfigured) {
      toast.error(t('errors.paymentMethodMissingBankDetails'))
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer: { firstName, lastName, phone },
          deliveryMethod,
          deliveryAddress: deliveryMethod === 'delivery' ? { street, city, zip } : undefined,
          preferredDate,
          customerNote: customerNote || undefined,
          paymentMethod,
          locale,
        }),
      })
      const json = await res.json() as { ok: boolean; orderNumber?: string; errors?: Array<{ productName: string; code: string; min?: number }>; reason?: string }
      if (!res.ok || !json.ok) {
        if (json.errors && json.errors.length > 0) {
          for (const err of json.errors) {
            toast.error(t(`errors.${err.code}` as never, { name: err.productName, min: err.min ?? 0 }))
          }
        } else if (json.reason === 'paymentMethodMissingBankDetails') {
          toast.error(t('errors.paymentMethodMissingBankDetails'))
        } else {
          toast.error(t('errors.generic'))
        }
        return
      }
      router.refresh()
      router.push(`/pokladna/dekujeme/${json.orderNumber}`)
    })
  }

  const err = (k: string) => errors[k] ? t(`errors.${errors[k]}` as never) : null

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">{tCart('summary.subtotal')}</h2>
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
        <div className="flex justify-between font-bold text-lg pt-3 mt-3 border-t border-gray-200">
          <span>{tCart('summary.total')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h2 className="text-lg font-semibold">{t('sections.customer')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.firstName')}</span>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            {err('firstName') && <span className="text-xs text-red-600">{err('firstName')}</span>}
          </label>
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.lastName')}</span>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            {err('lastName') && <span className="text-xs text-red-600">{err('lastName')}</span>}
          </label>
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.email')}</span>
            <input value={user.email} readOnly className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.phone')}</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            {err('phone') && <span className="text-xs text-red-600">{err('phone')}</span>}
          </label>
        </div>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h2 className="text-lg font-semibold">{t('sections.delivery')}</h2>
        <fieldset className="space-y-2">
          <label className="flex items-start gap-3">
            <input type="radio" name="dm" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} className="mt-1" />
            <span>
              <span className="font-medium block">{t('deliveryMethod.pickup')}</span>
              <span className="text-sm text-text-secondary">{t('deliveryMethod.pickupInfo')}</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="dm" checked={deliveryMethod === 'delivery'} onChange={() => setDeliveryMethod('delivery')} className="mt-1" />
            <span>
              <span className="font-medium block">{t('deliveryMethod.delivery')}</span>
              <span className="text-sm text-text-secondary">{t('deliveryMethod.deliveryFreeRegion')}</span>
            </span>
          </label>
        </fieldset>

        {deliveryMethod === 'pickup' && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <div><strong>{farm.address.street}</strong></div>
            <div>{farm.address.zip} {farm.address.city}</div>
            {farm.phone && <div>Tel.: {farm.phone}</div>}
            {farm.openingHours && <div className="whitespace-pre-line">{farm.openingHours}</div>}
          </div>
        )}

        {deliveryMethod === 'delivery' && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-sm mb-1">{t('fields.street')}</span>
              <input value={street} onChange={e => setStreet(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              {err('street') && <span className="text-xs text-red-600">{err('street')}</span>}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block">
                <span className="block text-sm mb-1">{t('fields.city')}</span>
                <input value={city} onChange={e => setCity(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                {err('city') && <span className="text-xs text-red-600">{err('city')}</span>}
              </label>
              <label className="block">
                <span className="block text-sm mb-1">{t('fields.zip')}</span>
                <input value={zip} onChange={e => setZip(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                {err('zip') && <span className="text-xs text-red-600">{err('zip')}</span>}
              </label>
            </div>
          </div>
        )}

        <label className="block">
          <span className="block text-sm mb-1">{t('fields.preferredDate')}</span>
          <input type="date" min={today} value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          {err('preferredDate') && <span className="text-xs text-red-600">{err('preferredDate')}</span>}
        </label>

        <label className="block">
          <span className="block text-sm mb-1">{t('fields.customerNote')}</span>
          <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-3">
        <h2 className="text-lg font-semibold">{t('sections.payment')}</h2>
        <fieldset className="space-y-2">
          <label className="flex items-start gap-3">
            <input type="radio" name="pm" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} className="mt-1" />
            <span className="font-medium">{t('paymentMethod.bankTransfer')}</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="pm" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} className="mt-1" />
            <span className="font-medium">{t('paymentMethod.cashOnDelivery')}</span>
          </label>
        </fieldset>
      </section>

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={agreement} onChange={e => setAgreement(e.target.checked)} className="mt-1" />
        <span className="text-sm" dangerouslySetInnerHTML={{ __html: t.raw('fields.agreement') as string }} />
      </label>
      {err('agreement') && <div className="text-xs text-red-600 -mt-3">{err('agreement')}</div>}

      <button type="submit" disabled={submitting} className="w-full bg-brand-cream text-brand-green hover:bg-brand-cream-dark py-4 rounded-lg font-bold text-lg disabled:opacity-60">
        {submitting ? '…' : t('submit')}
      </button>

      <Link href="/kosik" className="block text-center text-sm text-text-secondary underline">
        {tCart('cta.continueShopping')}
      </Link>
    </form>
  )
}
