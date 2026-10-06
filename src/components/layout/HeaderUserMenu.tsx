import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { LogoutButton } from './LogoutButton'
import { CartBadge } from '@/components/cart/CartBadge'
import { resolveCart } from '@/lib/cart/getOrCreateCart'
import { readGuestToken } from '@/lib/cart/guestToken.server'

type Props = {
  locale: 'cs' | 'en'
}

export async function HeaderUserMenu({ locale }: Props) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const guestToken = await readGuestToken()
  const t = await getTranslations('nav.auth')

  // Guests have carts too, so the badge is always there.
  const cart = await resolveCart(payload, { user: user ?? null, guestToken })

  if (!user) {
    return (
      <>
        <CartBadge cart={cart} locale={locale} />
        <Link
          href="/prihlaseni"
          className="hidden text-sm font-semibold text-ink underline-offset-4 hover:underline sm:inline"
        >
          {t('login')}
        </Link>
      </>
    )
  }

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
