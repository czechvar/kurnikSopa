'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Props = {
  userId: number
  defaultValues: { firstName: string; lastName: string; phone: string }
}

export function PersonalInfoForm({ userId, defaultValues }: Props) {
  const t = useTranslations('account.personal')
  const router = useRouter()
  const [values, setValues] = useState(defaultValues)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setErrorKey(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
      router.refresh()
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="personal-h2">
      <h2 id="personal-h2" className="text-xl font-semibold mb-4">{t('title')}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {success && (
          <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">{t('successSaved')}</div>
        )}
        {errorKey && (
          <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey)}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">{t('firstName')}</label>
            <input id="firstName" required value={values.firstName} onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1">{t('lastName')}</label>
            <input id="lastName" required value={values.lastName} onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">{t('phone')}</label>
          <input id="phone" type="tel" required value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <button type="submit" disabled={submitting} className="bg-brand-green text-brand-cream font-semibold rounded-lg px-5 py-2 hover:bg-brand-green-deep disabled:opacity-60">
          {t('save')}
        </button>
      </form>
    </section>
  )
}
