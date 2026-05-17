'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/users/forgot-password', {
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
        className="w-full bg-brand-cream text-brand-green font-semibold rounded-lg py-2.5 hover:bg-brand-cream-dark disabled:opacity-60"
      >
        {t('submit')}
      </button>
    </form>
  )
}
