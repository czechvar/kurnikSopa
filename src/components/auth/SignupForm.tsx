'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/lib/i18n/routing'
import { mapPayloadError } from '@/lib/auth/errors'

const ZIP_RE = /^\d{3}\s?\d{2}$/

export function SignupForm() {
  const t = useTranslations('auth.signup')
  const tFields = useTranslations('auth.signup.fields')
  const tErr = useTranslations('auth.signup.errors')
  const router = useRouter()
  const locale = useLocale()
  const pathname = usePathname()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    street: '',
    city: '',
    zip: '',
    agreement: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrorKey, setFieldErrorKey] = useState<string | null>(null)
  const [generalErrorKey, setGeneralErrorKey] = useState<string | null>(null)

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function clientValidate(): string | null {
    if (form.password.length < 8) return 'passwordTooShort'
    if (form.password !== form.passwordConfirm) return 'passwordMismatch'
    if (!ZIP_RE.test(form.zip)) return 'zipInvalid'
    if (!form.agreement) return 'agreementRequired'
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrorKey(null)
    setGeneralErrorKey(null)

    const v = clientValidate()
    if (v) {
      setFieldErrorKey(v)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          role: 'customer',
          addresses: [
            {
              label: locale === 'en' ? 'Primary' : 'Hlavní',
              street: form.street,
              city: form.city,
              zip: form.zip,
            },
          ],
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const key = mapPayloadError(res.status, body, 'signup')
        // mapPayloadError returns the full path; strip prefix so tErr (scoped to
        // auth.signup.errors) can resolve it.
        setGeneralErrorKey(key.replace(/^auth\.signup\.errors\./, ''))
        setSubmitting(false)
        return
      }
      router.push(`${pathname}?status=check-email`)
    } catch {
      setGeneralErrorKey('generic')
      setSubmitting(false)
    }
  }

  const labelClass = 'block text-sm font-medium mb-1'
  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2'

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {(generalErrorKey || fieldErrorKey) && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {tErr((generalErrorKey ?? fieldErrorKey) as string)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="firstName">{tFields('firstName')}</label>
          <input id="firstName" required value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} className={inputClass} autoComplete="given-name" />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">{tFields('lastName')}</label>
          <input id="lastName" required value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} className={inputClass} autoComplete="family-name" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">{tFields('email')}</label>
        <input id="email" type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} autoComplete="email" />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">{tFields('phone')}</label>
        <input id="phone" type="tel" required value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClass} autoComplete="tel" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="password">{tFields('password')}</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => setField('password', e.target.value)} className={inputClass} autoComplete="new-password" />
        </div>
        <div>
          <label className={labelClass} htmlFor="passwordConfirm">{tFields('passwordConfirm')}</label>
          <input id="passwordConfirm" type="password" required minLength={8} value={form.passwordConfirm} onChange={(e) => setField('passwordConfirm', e.target.value)} className={inputClass} autoComplete="new-password" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="street">{tFields('street')}</label>
        <input id="street" required value={form.street} onChange={(e) => setField('street', e.target.value)} className={inputClass} autoComplete="address-line1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="city">{tFields('city')}</label>
          <input id="city" required value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputClass} autoComplete="address-level2" />
        </div>
        <div>
          <label className={labelClass} htmlFor="zip">{tFields('zip')}</label>
          <input id="zip" required value={form.zip} onChange={(e) => setField('zip', e.target.value)} className={inputClass} autoComplete="postal-code" />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" required checked={form.agreement} onChange={(e) => setField('agreement', e.target.checked)} className="mt-1" />
        <span>{t('agreement')}</span>
      </label>

      <button type="submit" disabled={submitting} className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60">
        {t('submit')}
      </button>

      <p className="text-sm text-center pt-2">
        {t('haveAccount')} <Link href="/prihlaseni" className="text-brand-green hover:underline">{t('loginLink')}</Link>
      </p>
    </form>
  )
}
