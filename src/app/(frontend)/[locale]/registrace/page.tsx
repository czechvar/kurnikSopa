import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Link, redirect } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import { AccessRequestForm } from '@/components/auth/AccessRequestForm'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ status?: string }>
}

/** Accounts are by invitation (ADR 0002): this page asks for one. */
export default async function AccessRequestPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { status } = await searchParams

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const t = await getTranslations({ locale, namespace: 'auth.request' })

  if (status === 'requested') {
    return (
      <div className="mx-auto max-w-md px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold text-ink">{t('success.title')}</h1>
        <p className="text-ink-muted">{t('success.body')}</p>
        <Link href="/produkty" className={buttonClass('outline')}>{t('success.cta')}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">{t('title')}</h1>
      <AccessRequestForm />
    </div>
  )
}
