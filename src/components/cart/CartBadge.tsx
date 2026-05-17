import { Link } from '@/lib/i18n/routing'
import { getTranslations } from 'next-intl/server'
import type { Cart } from '@/payload-types'

type Props = { cart: Cart | null; locale: 'cs' | 'en' }

export async function CartBadge({ cart, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'nav.cart' })
  const count = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0

  return (
    <Link href="/kosik" className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10" aria-label={t('cart')}>
      <span aria-hidden="true">🛒</span>
      <span className="hidden sm:inline">{t('cart')}</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand-gold text-brand-green-deep text-xs font-bold rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  )
}
