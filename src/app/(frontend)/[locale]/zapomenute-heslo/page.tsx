import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }
  const t = await getTranslations({ locale, namespace: 'auth.forgot' })
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="text-text-secondary mb-6">{t('intro')}</p>
      <ForgotPasswordForm />
    </div>
  )
}
