'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type State = 'verifying' | 'success' | 'expired' | 'resent'

export function VerifyEmailClient({ token, email }: { token: string; email?: string }) {
  const t = useTranslations('auth.verify')
  const router = useRouter()
  const [state, setState] = useState<State>('verifying')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/users/verify/${encodeURIComponent(token)}`, {
          method: 'POST',
        })
        if (cancelled) return
        if (res.ok) {
          setState('success')
          router.replace('/prihlaseni?toast=emailVerified&type=success')
        } else {
          setState('expired')
        }
      } catch {
        if (!cancelled) setState('expired')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

  async function resend() {
    if (!email) return
    await fetch('/api/users/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setState('resent')
  }

  if (state === 'verifying') return <p>{t('verifying')}</p>
  if (state === 'success') return <p>{t('success')}</p>
  if (state === 'resent') return <p>{t('resendSent')}</p>

  return (
    <div className="space-y-4">
      <p className="text-red-700">{t('tokenExpired')}</p>
      {email && (
        <button
          onClick={resend}
          className="bg-brand-cream text-brand-green font-semibold rounded-lg px-4 py-2 hover:bg-brand-cream-dark"
        >
          {t('resendLink')}
        </button>
      )}
    </div>
  )
}
