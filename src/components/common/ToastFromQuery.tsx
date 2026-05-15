'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { isToastKey, isToastType } from '@/lib/toast-keys'

export function ToastFromQuery() {
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('toasts')

  useEffect(() => {
    const key = search.get('toast')
    const type = search.get('type')
    if (!isToastKey(key) || !isToastType(type)) return

    const title = t(`${key}.title` as Parameters<typeof t>[0])
    const body = t(`${key}.body` as Parameters<typeof t>[0])
    toast[type](title, { description: body })

    // Strip the params so back-nav / refresh doesn't refire.
    const next = new URLSearchParams(search.toString())
    next.delete('toast')
    next.delete('type')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, router, pathname, t])

  return null
}
