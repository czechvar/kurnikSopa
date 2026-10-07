'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import { mapPayloadError } from '@/lib/auth/errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldName = 'firstName' | 'lastName' | 'email' | 'phone' | 'message' | 'agreement'
type FieldErrors = Partial<Record<FieldName, string>>

/**
 * Asks for an account (glossary: Access Request). There is no public sign-up;
 * the owner turns a request into an Invitation from the admin.
 */
export function AccessRequestForm() {
  const t = useTranslations('auth.request')
  const tFields = useTranslations('auth.request.fields')
  const tErr = useTranslations('auth.request.errors')
  const router = useRouter()
  const locale = useLocale() === 'en' ? 'en' : 'cs'

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '', agreement: false })
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalErrorKey, setGeneralErrorKey] = useState<string | null>(null)

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErrors(errs => {
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
    if (!form.agreement) errs.agreement = 'agreementRequired'
    return errs
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGeneralErrorKey(null)
    const errs = clientValidate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) {
      document.getElementById(Object.keys(errs)[0]!)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          message: form.message || undefined,
          locale,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setGeneralErrorKey(mapPayloadError(res.status, body, 'request').replace(/^auth\.request\.errors\./, ''))
        setSubmitting(false)
        return
      }
      router.push({ pathname: '/registrace', query: { status: 'requested' } })
    } catch {
      setGeneralErrorKey('generic')
      setSubmitting(false)
    }
  }

  const labelClass = 'mb-1 block text-sm font-medium'
  const inputCls = (name: FieldName) =>
    `w-full rounded border bg-ground px-3 py-2 text-ink focus:outline-none ${fieldErrors[name] ? 'border-red-600' : 'border-line focus:border-ink'}`

  function FieldError({ name }: { name: FieldName }) {
    const k = fieldErrors[name]
    if (!k) return null
    return <p role="alert" className="mt-1 text-sm text-red-700">{tErr(k as 'required')}</p>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-ink-muted">{t('intro')}</p>

      {generalErrorKey && (
        <div role="alert" className="rounded bg-red-50 px-4 py-3 text-red-800">
          {tErr(generalErrorKey as 'generic')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">{tFields('firstName')}</label>
          <input id="firstName" value={form.firstName} onChange={e => setField('firstName', e.target.value)} className={inputCls('firstName')} autoComplete="given-name" aria-invalid={!!fieldErrors.firstName} />
          <FieldError name="firstName" />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">{tFields('lastName')}</label>
          <input id="lastName" value={form.lastName} onChange={e => setField('lastName', e.target.value)} className={inputCls('lastName')} autoComplete="family-name" aria-invalid={!!fieldErrors.lastName} />
          <FieldError name="lastName" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">{tFields('email')}</label>
        <input id="email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} className={inputCls('email')} autoComplete="email" aria-invalid={!!fieldErrors.email} />
        <FieldError name="email" />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">{tFields('phone')}</label>
        <input id="phone" type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} className={inputCls('phone')} autoComplete="tel" aria-invalid={!!fieldErrors.phone} />
        <FieldError name="phone" />
      </div>

      <div>
        <label className={labelClass} htmlFor="message">{tFields('message')}</label>
        <textarea id="message" rows={3} maxLength={2000} value={form.message} onChange={e => setField('message', e.target.value)} className={inputCls('message')} />
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input id="agreement" type="checkbox" checked={form.agreement} onChange={e => setField('agreement', e.target.checked)} className="mt-1" aria-invalid={!!fieldErrors.agreement} />
          <span dangerouslySetInnerHTML={{ __html: t.raw('agreement') as string }} />
        </label>
        <FieldError name="agreement" />
      </div>

      <button type="submit" disabled={submitting} className={buttonClass('primary', 'md', 'w-full')}>
        {t('submit')}
      </button>

      <p className="pt-2 text-center text-sm text-ink-muted">{t('orderWithout')}</p>
      <p className="text-center text-sm">
        {t('haveAccount')}{' '}
        <Link href="/prihlaseni" className="font-medium text-ink underline underline-offset-4 hover:text-ink-deep">{t('loginLink')}</Link>
      </p>
    </form>
  )
}
