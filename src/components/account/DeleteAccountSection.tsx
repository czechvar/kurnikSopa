'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Props = { userId: number; userEmail: string }

export function DeleteAccountSection({ userId, userEmail }: Props) {
  const t = useTranslations('account.delete')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onConfirm() {
    setErrorKey(null)
    if (typed.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setErrorKey('errors.emailMismatch')
      return
    }
    setSubmitting(true)
    try {
      const del = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!del.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
      router.push('/')
      router.refresh()
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="delete-h2">
      <h2 id="delete-h2" className="text-xl font-semibold text-red-700 mb-4">{t('title')}</h2>
      <p className="text-text-secondary mb-4">{t('warning')}</p>
      <button type="button" onClick={() => setOpen(true)} className="border border-red-700 text-red-700 font-semibold rounded-lg px-5 py-2 hover:bg-red-700 hover:text-white">
        {t('button')}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">{t('confirmModal.title')}</h3>
            <p>{t('confirmModal.body')}</p>
            {errorKey && (
              <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey as 'errors.emailMismatch')}</div>
            )}
            <input
              aria-label={t('confirmModal.typeEmailPrompt')}
              placeholder={t('confirmModal.typeEmailPrompt')}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setOpen(false); setTyped(''); setErrorKey(null) }} className="rounded-lg px-4 py-2">
                {t('confirmModal.cancel')}
              </button>
              <button type="button" disabled={submitting} onClick={onConfirm} className="bg-red-700 text-white font-semibold rounded-lg px-4 py-2 hover:bg-red-800 disabled:opacity-60">
                {t('confirmModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
