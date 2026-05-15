import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { toastQuery } from '@/lib/toast-keys'
import { getTranslations } from 'next-intl/server'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CartPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect({
      href: {
        pathname: '/registrace',
        query: toastQuery('loginRequiredCart', 'info'),
      },
      locale,
    })
  }

  const t = await getTranslations({ locale, namespace: 'cart' })
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <p className="text-text-secondary">{t('comingSoon')}</p>
    </div>
  )
}
