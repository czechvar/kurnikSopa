'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'
import { mapPayloadError } from '@/lib/auth/errors'

export function LoginForm() {
  const t = useTranslations('auth.login')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorKey(mapPayloadError(res.status, body, 'login'))
        setSubmitting(false)
        return
      }
      router.push('/ucet')
      router.refresh()
    } catch {
      setErrorKey('auth.login.errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {errorKey && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {t(errorKey.replace(/^auth\.login\./, ''))}
        </div>
      )}
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
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">{t('password')}</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60"
      >
        {t('submit')}
      </button>
      <div className="flex justify-between text-sm pt-2">
        <Link href="/zapomenute-heslo" className="text-brand-green hover:underline">{t('forgotLink')}</Link>
        <span>
          {t('noAccount')} <Link href="/registrace" className="text-brand-green hover:underline">{t('registerLink')}</Link>
        </span>
      </div>
    </form>
  )
}
