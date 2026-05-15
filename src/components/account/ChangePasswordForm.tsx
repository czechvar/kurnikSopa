'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Props = { userEmail: string; userId: number }

export function ChangePasswordForm({ userEmail, userId }: Props) {
  const t = useTranslations('account.password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)
    setSuccess(false)

    if (next.length < 8) {
      setErrorKey('errors.tooShort')
      return
    }
    if (next !== confirm) {
      setErrorKey('errors.mismatch')
      return
    }

    setSubmitting(true)
    try {
      // Re-authenticate to prove possession of the current password.
      // Payload's login also refreshes the cookie — no logout side effect.
      const reauth = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: userEmail, password: current }),
      })
      if (!reauth.ok) {
        setErrorKey('errors.currentWrong')
        setSubmitting(false)
        return
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: next }),
      })
      if (!res.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setSubmitting(false)
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="password-h2">
      <h2 id="password-h2" className="text-xl font-semibold mb-4">{t('title')}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {success && (
          <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">{t('successSaved')}</div>
        )}
        {errorKey && (
          <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey as 'errors.currentWrong')}</div>
        )}
        <div>
          <label htmlFor="current" className="block text-sm font-medium mb-1">{t('current')}</label>
          <input id="current" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="new" className="block text-sm font-medium mb-1">{t('new')}</label>
            <input id="new" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium mb-1">{t('confirm')}</label>
            <input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="bg-brand-green text-brand-cream font-semibold rounded-lg px-5 py-2 hover:bg-brand-green-deep disabled:opacity-60">
          {t('save')}
        </button>
      </form>
    </section>
  )
}
