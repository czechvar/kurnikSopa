import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { formatPhone } from '@/lib/utils'
import { LoginForm } from '@/components/auth/LoginForm'
import type { SiteSetting } from '@/payload-types'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ next?: string | string[] }>
}

/** Only a same-origin, locale-prefixed path may be a return target. */
function safeNext(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return null
  if (!/^\/(cs|en)(\/|$)/.test(v)) return null
  return v
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { next } = await searchParams

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const t = await getTranslations({ locale, namespace: 'auth.login' })

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">{t('title')}</h1>
      <LoginForm
        next={safeNext(next)}
        farmPhone={settings.contact?.phone ? formatPhone(settings.contact.phone) : null}
      />
    </div>
  )
}
