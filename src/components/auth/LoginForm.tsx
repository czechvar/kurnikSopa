'use client'

import { useState } from 'react'
import { useRouter as useRawRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import { mapPayloadError } from '@/lib/auth/errors'

type Props = {
  /** Same-origin path to return to after login (already locale-prefixed), or null for the account page. */
  next: string | null
  farmPhone: string | null
}

export function LoginForm({ next, farmPhone }: Props) {
  const t = useTranslations('auth.login')
  const router = useRouter()
  const rawRouter = useRawRouter()
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
      if (next) rawRouter.push(next)
      else router.push('/ucet')
      rawRouter.refresh()
    } catch {
      setErrorKey('auth.login.errors.generic')
      setSubmitting(false)
    }
  }

  const input = 'w-full rounded border border-line bg-ground px-3 py-2 text-ink focus:border-ink focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {errorKey && (
        <div role="alert" className="rounded bg-red-50 px-4 py-3 text-red-800">
          {t(errorKey.replace(/^auth\.login\./, '') as never)}
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">{t('email')}</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">{t('password')}</label>
        <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} />
      </div>
      <button type="submit" disabled={submitting} className={buttonClass('primary', 'md', 'w-full')}>
        {t('submit')}
      </button>
      <div className="pt-2 text-sm">
        <Link href="/zapomenute-heslo" className="font-medium text-ink underline underline-offset-4 hover:text-ink-deep">{t('forgotLink')}</Link>
      </div>
      <div className="space-y-1 border-t border-line pt-4 text-sm text-ink-muted">
        <p>{t('invitationNote')}</p>
        <p>
          {t('noAccount')}{' '}
          <Link href="/registrace" className="font-medium text-ink underline underline-offset-4 hover:text-ink-deep">{t('registerLink')}</Link>
          {farmPhone && <> · {t('callUs', { phone: farmPhone })}</>}
        </p>
      </div>
    </form>
  )
}
