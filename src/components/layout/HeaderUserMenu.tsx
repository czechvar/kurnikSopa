import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { LogoutButton } from './LogoutButton'
import { CartBadge } from '@/components/cart/CartBadge'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'

type Props = {
  locale: 'cs' | 'en'
}

export async function HeaderUserMenu({ locale }: Props) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const t = await getTranslations('nav.auth')

  if (!user) {
    return (
      <Link
        href="/prihlaseni"
        className="hidden text-sm font-semibold text-ink underline-offset-4 hover:underline sm:inline"
      >
        {t('login')}
      </Link>
    )
  }

  const cart = await getOrCreateCart(payload, user.id)

  return (
    <>
      <CartBadge cart={cart} locale={locale} />
      <details className="relative hidden sm:block">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
          {user.firstName ?? user.email} <span aria-hidden="true">▾</span>
        </summary>
        <div className="absolute right-0 z-50 mt-2 min-w-44 rounded border border-line bg-ground p-2 shadow-lg">
          <Link href="/ucet" className="block rounded px-3 py-2 text-sm hover:bg-ground-sunken">
            {t('account')}
          </Link>
          <Link href="/ucet/objednavky" className="block rounded px-3 py-2 text-sm hover:bg-ground-sunken">
            {t('orders')}
          </Link>
          <LogoutButton label={t('logout')} />
        </div>
      </details>
    </>
  )
}
