'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@/payload-types'

type Address = NonNullable<User['addresses']>[number]

type Props = {
  userId: number
  defaultAddresses: NonNullable<User['addresses']>
}

const ZIP_RE = /^\d{3}\s?\d{2}$/

export function AddressesManager({ userId, defaultAddresses }: Props) {
  const t = useTranslations('account.addresses')
  const router = useRouter()
  const [rows, setRows] = useState<Address[]>(defaultAddresses)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  function update(i: number, patch: Partial<Address>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function add() {
    setRows((rs) => [...rs, { label: '', street: '', city: '', zip: '' } as Address])
  }
  function remove(i: number) {
    if (!confirm(t('confirmRemove'))) return
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setErrorKey(null)
    for (const r of rows) {
      if (!r.street || !r.city || !ZIP_RE.test(r.zip)) {
        setErrorKey('errors.generic')
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addresses: rows }),
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
    <section aria-labelledby="addresses-h2">
      <h2 id="addresses-h2" className="text-xl font-semibold mb-4">{t('title')}</h2>
      <form onSubmit={save} className="space-y-6">
        {success && (
          <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">{t('successSaved')}</div>
        )}
        {errorKey && (
          <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey as 'errors.generic')}</div>
        )}
        {rows.length === 0 && <p className="text-text-secondary">{t('empty')}</p>}
        {rows.map((r, i) => (
          <fieldset key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="px-2 text-sm font-medium">{r.label || `#${i + 1}`}</legend>
            <div>
              <label className="block text-sm font-medium mb-1">{t('label')}</label>
              <input value={r.label ?? ''} onChange={(e) => update(i, { label: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('street')}</label>
              <input required value={r.street} onChange={(e) => update(i, { street: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('city')}</label>
                <input required value={r.city} onChange={(e) => update(i, { city: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('zip')}</label>
                <input required value={r.zip} onChange={(e) => update(i, { zip: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </div>
            </div>
            <button type="button" onClick={() => remove(i)} className="text-sm text-red-700 hover:underline">{t('remove')}</button>
          </fieldset>
        ))}
        <div className="flex gap-3">
          <button type="button" onClick={add} className="border border-brand-cream text-brand-cream font-semibold rounded-lg px-5 py-2 hover:bg-brand-cream hover:text-brand-green">
            {t('addRow')}
          </button>
          <button type="submit" disabled={submitting} className="bg-brand-cream text-brand-green font-semibold rounded-lg px-5 py-2 hover:bg-brand-cream-dark disabled:opacity-60">
            {t('save')}
          </button>
        </div>
      </form>
    </section>
  )
}
