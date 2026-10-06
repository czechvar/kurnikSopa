import { Link } from '@/lib/i18n/routing'
import { getTranslations } from 'next-intl/server'
import type { Cart } from '@/payload-types'

type Props = { cart: Cart | null; locale: 'cs' | 'en' }

export async function CartBadge({ cart, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'nav.cart' })
  const count = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0

  return (
    <Link
      href="/kosik"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded text-ink hover:bg-ground-sunken"
      aria-label={`${t('cart')}: ${t('items', { count })}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
        <path
          d="M3 4h2.2l2.3 10.5h10.3L20 7H7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="18.5" r="1.5" fill="currentColor" />
        <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-ink-deep"
        >
          {count}
        </span>
      )}
    </Link>
  )
}
