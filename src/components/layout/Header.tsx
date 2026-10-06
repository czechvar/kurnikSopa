import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { getSiteSettings } from '@/lib/site-settings'
import { formatPhone } from '@/lib/utils'
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher'
import { Logo } from './Logo'
import { NavLinks, type NavItem } from './NavLinks'
import { MobileNav } from './MobileNav'

type Props = {
  /** Cart + account menu, or a login link — rendered per request. */
  userMenu?: ReactNode
}

export async function Header({ userMenu }: Props) {
  const t = await getTranslations('nav')
  const settings = await getSiteSettings()
  const phone = settings.contact?.phone?.replace(/\s+/g, '')

  const items: NavItem[] = [
    { href: '/produkty', label: t('products') },
    { href: '/akce', label: t('events') },
    { href: '/o-nas', label: t('about') },
    { href: '/blog', label: t('blog') },
    { href: '/kontakt', label: t('contact') },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3 md:px-6">
        <Link href="/" className="shrink-0 text-ink" aria-label={t('home')}>
          <Logo className="h-10 w-auto md:h-11" title="" />
        </Link>

        <nav aria-label={t('mainLabel')} className="hidden md:block">
          <NavLinks items={items} variant="bar" />
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <span className="hidden md:inline-flex">
            <LocaleSwitcher />
          </span>
          {userMenu}
          <MobileNav
            items={items}
            openLabel={t('menu.open')}
            closeLabel={t('menu.close')}
            footer={<LocaleSwitcher />}
            phone={
              phone
                ? { href: `tel:+420${phone.replace(/^\+?420/, '')}`, label: `${t('callUs')} ${formatPhone(phone)}` }
                : undefined
            }
          />
        </div>
      </div>
    </header>
  )
}
