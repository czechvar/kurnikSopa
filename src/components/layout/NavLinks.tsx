'use client'

import { Link, usePathname } from '@/lib/i18n/routing'

export type NavItem = {
  href: '/produkty' | '/akce' | '/o-nas' | '/blog' | '/kontakt'
  label: string
}

type Props = {
  items: NavItem[]
  /** 'bar' for the desktop header, 'sheet' for the phone menu. */
  variant: 'bar' | 'sheet'
  onNavigate?: () => void
}

export function NavLinks({ items, variant, onNavigate }: Props) {
  // next-intl returns the internal pathname (/produkty/[slug] on a product page).
  const pathname = usePathname()
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  if (variant === 'sheet') {
    return (
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item) => {
          const current = isCurrent(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                className="flex items-center justify-between py-4 font-heading text-2xl font-extrabold text-ink"
              >
                {item.label}
                {current && <span aria-hidden="true" className="h-1 w-7 rounded-full bg-accent" />}
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="flex items-center gap-6">
      {items.map((item) => {
        const current = isCurrent(item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? 'page' : undefined}
              className={
                'block border-b-[3px] py-1 transition-colors ' +
                (current
                  ? 'border-accent font-bold text-ink'
                  : 'border-transparent font-medium text-ink hover:border-line')
              }
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
