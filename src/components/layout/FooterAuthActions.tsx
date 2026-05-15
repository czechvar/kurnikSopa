import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher'

export async function FooterAuthActions() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const t = await getTranslations('nav.auth')

  return (
    <div className="flex items-center gap-6 text-sm">
      <LocaleSwitcher />
      {!user && (
        <>
          <Link href="/prihlaseni" className="hover:text-brand-cream transition-colors">
            {t('login')}
          </Link>
          <Link href="/registrace" className="hover:text-brand-cream transition-colors">
            {t('register')}
          </Link>
        </>
      )}
    </div>
  )
}
