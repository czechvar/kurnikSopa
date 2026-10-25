'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot')
  const locale = useLocale() === 'en' ? 'en' : 'cs'
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // The email follows the account's own language; this page's language is
    // only the fallback for an account without one.
    await fetch(`/api/users/forgot-password?locale=${locale}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">
        {t('successBody')}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">{t('email')}</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-ink text-ground font-semibold rounded-lg py-2.5 hover:bg-ink-deep disabled:opacity-60"
      >
        {t('submit')}
      </button>
    </form>
  )
}
