import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Link, redirect } from '@/lib/i18n/routing'
import { PersonalInfoForm } from '@/components/account/PersonalInfoForm'
import { AddressesManager } from '@/components/account/AddressesManager'
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm'
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function AccountPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect({ href: '/prihlaseni', locale })
  }

  const t = await getTranslations({ locale, namespace: 'account' })

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <Link
        href="/ucet/objednavky"
        className="block bg-white rounded-lg p-5 border border-gray-200 hover:border-brand-green transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{t('orders.title')}</span>
          <span className="text-sm text-brand-green">{t('orders.linkCardCta')} →</span>
        </div>
      </Link>
      <PersonalInfoForm
        userId={user!.id}
        email={user!.email}
        defaultValues={{
          firstName: user!.firstName ?? '',
          lastName: user!.lastName ?? '',
          phone: user!.phone ?? '',
        }}
      />
      <AddressesManager
        userId={user!.id}
        defaultAddresses={user!.addresses ?? []}
      />
      <ChangePasswordForm userEmail={user!.email} userId={user!.id} />
      <DeleteAccountSection userId={user!.id} userEmail={user!.email} />
    </div>
  )
}
