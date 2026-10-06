import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher'

/** The footer's account column: depends on the session, so rendered per request. */
export async function FooterAuthActions() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const t = await getTranslations('nav.auth')
  const link = 'hover:text-ground hover:underline underline-offset-4'

  return (
    <ul className="space-y-1.5">
      {user ? (
        <>
          <li><Link href="/ucet" className={link}>{t('account')}</Link></li>
          <li><Link href="/ucet/objednavky" className={link}>{t('orders')}</Link></li>
        </>
      ) : (
        <>
          <li><Link href="/prihlaseni" className={link}>{t('login')}</Link></li>
          <li><Link href="/registrace" className={link}>{t('register')}</Link></li>
        </>
      )}
      <li className="pt-1"><LocaleSwitcher className="text-panel-sage hover:text-ground" /></li>
    </ul>
  )
}
