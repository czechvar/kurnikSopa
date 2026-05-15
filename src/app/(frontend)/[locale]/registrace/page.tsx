import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { SignupForm } from '@/components/auth/SignupForm'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ status?: string }>
}

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { status } = await searchParams

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const t = await getTranslations({ locale, namespace: 'auth.signup' })

  if (status === 'check-email') {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">{t('success.checkEmailTitle')}</h1>
        <p className="text-text-secondary">{t('success.checkEmailBody')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <SignupForm />
    </div>
  )
}
