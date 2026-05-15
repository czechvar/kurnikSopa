import { getTranslations } from 'next-intl/server'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

type Props = { params: Promise<{ locale: 'cs' | 'en'; token: string }> }

export default async function ResetPasswordPage({ params }: Props) {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'auth.reset' })
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <ResetPasswordForm token={token} />
    </div>
  )
}
