'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { mapPayloadError } from '@/lib/auth/errors'

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth.reset')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)

    if (password.length < 8) {
      setErrorKey('passwordTooShort')
      return
    }
    if (password !== confirm) {
      setErrorKey('passwordMismatch')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const key = mapPayloadError(res.status, body, 'reset')
        setErrorKey(key.replace(/^auth\.reset\.errors\./, ''))
        setSubmitting(false)
        return
      }
      router.push('/prihlaseni?toast=passwordReset&type=success')
    } catch {
      setErrorKey('generic')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorKey && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {t(`errors.${errorKey}`)}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">{t('password')}</label>
        <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="passwordConfirm" className="block text-sm font-medium mb-1">{t('passwordConfirm')}</label>
        <input id="passwordConfirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
      </div>
      <button type="submit" disabled={submitting} className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60">
        {t('submit')}
      </button>
    </form>
  )
}
