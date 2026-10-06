'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import { mapPayloadError } from '@/lib/auth/errors'

/**
 * The invited person sets a password. The token comes from the invitation
 * email; accepting it activates the account, then we log them in.
 */
export function AcceptInvitationForm({ token, farmPhone }: { token: string; farmPhone: string | null }) {
  const t = useTranslations('auth.invite')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)
    if (password.length < 8) { setErrorKey('passwordTooShort'); return }
    if (password !== confirm) { setErrorKey('passwordMismatch'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; email?: string; reason?: string }
      if (!res.ok || !body.ok || !body.email) {
        const key = body.reason === 'passwordTooShort'
          ? 'passwordTooShort'
          : mapPayloadError(res.status, body, 'invite').replace(/^auth\.invite\.errors\./, '')
        setErrorKey(key)
        setSubmitting(false)
        return
      }
      const login = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: body.email, password }),
      })
      if (!login.ok) {
        router.push('/prihlaseni')
        return
      }
      router.push('/ucet')
      router.refresh()
    } catch {
      setErrorKey('generic')
      setSubmitting(false)
    }
  }

  const input = 'w-full rounded border border-line bg-ground px-3 py-2 text-ink focus:border-ink focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-ink-muted">{t('intro')}</p>
      {errorKey && (
        <div role="alert" className="rounded bg-red-50 px-4 py-3 text-red-800">
          {t(`errors.${errorKey}` as never)}
          {errorKey === 'tokenExpired' && farmPhone && <span className="block pt-1 text-sm">{t('callUs', { phone: farmPhone })}</span>}
        </div>
      )}
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">{t('password')}</label>
        <input id="password" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className={input} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium">{t('passwordConfirm')}</label>
        <input id="passwordConfirm" type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className={input} autoComplete="new-password" />
      </div>
      <button type="submit" disabled={submitting} className={buttonClass('primary', 'md', 'w-full')}>
        {t('submit')}
      </button>
    </form>
  )
}
