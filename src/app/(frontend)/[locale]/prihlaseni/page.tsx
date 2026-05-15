import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { LoginForm } from '@/components/auth/LoginForm'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ status?: string }>
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { status } = await searchParams

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const t = await getTranslations({ locale, namespace: 'auth.login' })

  let banner: string | null = null
  if (status === 'verified') banner = t('banners.verified')
  if (status === 'reset-ok') banner = t('banners.resetOk')

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      {banner && (
        <div role="status" className="mb-6 rounded-lg bg-green-50 text-green-800 px-4 py-3">
          {banner}
        </div>
      )}
      <LoginForm />
    </div>
  )
}
