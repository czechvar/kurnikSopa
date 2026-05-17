'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/lib/i18n/routing'
import { mapPayloadError } from '@/lib/auth/errors'

const ZIP_RE = /^\d{3}\s?\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldName =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'password'
  | 'passwordConfirm'
  | 'street'
  | 'city'
  | 'zip'
  | 'agreement'

type FieldErrors = Partial<Record<FieldName, string>>

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalErrorKey, setGeneralErrorKey] = useState<string | null>(null)

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    setFieldErrors((errs) => {
      if (!errs[k as FieldName]) return errs
      const next = { ...errs }
      delete next[k as FieldName]
      return next
    })
  }

  function clientValidate(): FieldErrors {
    const errs: FieldErrors = {}
    if (!form.firstName.trim()) errs.firstName = 'required'
    if (!form.lastName.trim()) errs.lastName = 'required'
    if (!form.email.trim()) errs.email = 'required'
    else if (!EMAIL_RE.test(form.email)) errs.email = 'emailInvalid'
    if (!form.phone.trim()) errs.phone = 'required'
    if (!form.password) errs.password = 'required'
    else if (form.password.length < 8) errs.password = 'passwordTooShort'
    if (!form.passwordConfirm) errs.passwordConfirm = 'required'
    else if (form.password !== form.passwordConfirm) errs.passwordConfirm = 'passwordMismatch'
    if (!form.street.trim()) errs.street = 'required'
    if (!form.city.trim()) errs.city = 'required'
    if (!form.zip.trim()) errs.zip = 'required'
    else if (!ZIP_RE.test(form.zip)) errs.zip = 'zipInvalid'
    if (!form.agreement) errs.agreement = 'agreementRequired'
    return errs
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGeneralErrorKey(null)

    const errs = clientValidate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0]
      const el = document.getElementById(firstKey)
      el?.focus()
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
        const stripped = key.replace(/^auth\.signup\.errors\./, '')
        // Surface field-specific errors on the relevant field; otherwise general banner.
        if (stripped === 'emailTaken' || stripped === 'emailInvalid') {
          setFieldErrors({ email: stripped })
          document.getElementById('email')?.focus()
        } else if (stripped === 'passwordTooShort') {
          setFieldErrors({ password: stripped })
          document.getElementById('password')?.focus()
        } else {
          setGeneralErrorKey(stripped)
        }
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
  const baseInputClass = 'w-full rounded-lg border px-3 py-2'
  const inputCls = (name: FieldName) =>
    `${baseInputClass} ${fieldErrors[name] ? 'border-red-500' : 'border-gray-300'}`

  function FieldError({ name }: { name: FieldName }) {
    const k = fieldErrors[name]
    if (!k) return null
    return (
      <p role="alert" className="text-sm text-red-300 mt-1">
        {tErr(k as 'required')}
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {generalErrorKey && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {tErr(generalErrorKey as 'generic')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="firstName">{tFields('firstName')}</label>
          <input id="firstName" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} className={inputCls('firstName')} autoComplete="given-name" aria-invalid={!!fieldErrors.firstName} />
          <FieldError name="firstName" />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">{tFields('lastName')}</label>
          <input id="lastName" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} className={inputCls('lastName')} autoComplete="family-name" aria-invalid={!!fieldErrors.lastName} />
          <FieldError name="lastName" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">{tFields('email')}</label>
        <input id="email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputCls('email')} autoComplete="email" aria-invalid={!!fieldErrors.email} />
        <FieldError name="email" />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">{tFields('phone')}</label>
        <input id="phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputCls('phone')} autoComplete="tel" aria-invalid={!!fieldErrors.phone} />
        <FieldError name="phone" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="password">{tFields('password')}</label>
          <input id="password" type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} className={inputCls('password')} autoComplete="new-password" aria-invalid={!!fieldErrors.password} />
          <FieldError name="password" />
        </div>
        <div>
          <label className={labelClass} htmlFor="passwordConfirm">{tFields('passwordConfirm')}</label>
          <input id="passwordConfirm" type="password" value={form.passwordConfirm} onChange={(e) => setField('passwordConfirm', e.target.value)} className={inputCls('passwordConfirm')} autoComplete="new-password" aria-invalid={!!fieldErrors.passwordConfirm} />
          <FieldError name="passwordConfirm" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="street">{tFields('street')}</label>
        <input id="street" value={form.street} onChange={(e) => setField('street', e.target.value)} className={inputCls('street')} autoComplete="address-line1" aria-invalid={!!fieldErrors.street} />
        <FieldError name="street" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="city">{tFields('city')}</label>
          <input id="city" value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputCls('city')} autoComplete="address-level2" aria-invalid={!!fieldErrors.city} />
          <FieldError name="city" />
        </div>
        <div>
          <label className={labelClass} htmlFor="zip">{tFields('zip')}</label>
          <input id="zip" value={form.zip} onChange={(e) => setField('zip', e.target.value)} className={inputCls('zip')} autoComplete="postal-code" aria-invalid={!!fieldErrors.zip} />
          <FieldError name="zip" />
        </div>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input id="agreement" type="checkbox" checked={form.agreement} onChange={(e) => setField('agreement', e.target.checked)} className="mt-1" aria-invalid={!!fieldErrors.agreement} />
          <span>{t('agreement')}</span>
        </label>
        <FieldError name="agreement" />
      </div>

      <button type="submit" disabled={submitting} className="w-full bg-brand-cream text-brand-green font-semibold rounded-lg py-2.5 hover:bg-brand-cream-dark disabled:opacity-60">
        {t('submit')}
      </button>

      <p className="text-sm text-center pt-2">
        {t('haveAccount')} <Link href="/prihlaseni" className="text-brand-gold hover:underline">{t('loginLink')}</Link>
      </p>
    </form>
  )
}
