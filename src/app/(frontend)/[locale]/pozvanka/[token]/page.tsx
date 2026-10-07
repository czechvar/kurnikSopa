import { getTranslations } from 'next-intl/server'
import { getSiteSettings } from '@/lib/site-settings'
import { formatPhone } from '@/lib/utils'
import { AcceptInvitationForm } from '@/components/auth/AcceptInvitationForm'

type Props = { params: Promise<{ locale: 'cs' | 'en'; token: string }> }

export default async function InvitationPage({ params }: Props) {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'auth.invite' })
  const settings = await getSiteSettings()
  const phone = settings.contact?.phone ? formatPhone(settings.contact.phone) : null
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">{t('title')}</h1>
      <AcceptInvitationForm token={token} farmPhone={phone} />
    </div>
  )
}
