import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { LogoutButton } from './LogoutButton'

export async function HeaderUserMenu() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const t = await getTranslations('nav.auth')

  if (!user) {
    return null
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-sm hover:text-brand-cream/70">
        {user.firstName ?? user.email}
      </summary>
      <div className="absolute right-0 mt-2 bg-white text-gray-900 rounded-lg shadow-lg p-2 min-w-44 z-50">
        <Link href="/ucet" className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">
          {t('account')}
        </Link>
        <LogoutButton label={t('logout')} />
      </div>
    </details>
  )
}
