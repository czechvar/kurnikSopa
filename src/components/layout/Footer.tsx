import type { ReactNode } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { getSiteSettings } from '@/lib/site-settings'
import { formatPhone } from '@/lib/utils'
import { FooterCookiesLink } from './FooterCookiesLink'
import { Logo } from './Logo'

export async function FooterComponent({ authActions }: { authActions?: ReactNode }) {
  const t = await getTranslations('footer')
  const tCommon = await getTranslations('common')
  const tNav = await getTranslations('nav')
  const locale = await getLocale()
  const settings = await getSiteSettings()

  const currentYear = new Date().getFullYear()
  // These two pages live outside the next-intl pathname map.
  const cookiesHref = `/${locale}/cookies`
  const termsHref = `/${locale}/obchodni-podminky`
  const privacyHref = `/${locale}/ochrana-osobnich-udaju`

  const phone = settings.contact?.phone?.replace(/\s+/g, '')
  const phoneDigits = phone?.replace(/^\+?420/, '')
  const whatsapp = settings.contact?.whatsapp?.replace(/\s+/g, '').replace(/^\+?420/, '')
  const email = settings.contact?.email
  const address = settings.address
  const link = 'hover:text-ground hover:underline underline-offset-4'

  return (
    <footer className="on-dark mt-auto bg-ink-deep text-panel-sage">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="h-14 w-auto text-ground" />
            <p className="mt-4 text-sm leading-relaxed">{tCommon('tagline')}</p>
            {address && (
              <p className="mt-2 text-sm leading-relaxed">
                {address.street && <>{address.street}<br /></>}
                {address.zip} {address.city}
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-heading text-base text-ground">{t('contactHeading')}</h2>
            <ul className="space-y-1.5 text-sm">
              {phone && (
                <li><a href={`tel:+420${phoneDigits}`} className={link}>{formatPhone(phone)}</a></li>
              )}
              {email && (
                <li><a href={`mailto:${email}`} className={link}>{email}</a></li>
              )}
              {whatsapp && (
                <li>
                  <a href={`https://wa.me/420${whatsapp}`} target="_blank" rel="noopener noreferrer" className={link}>
                    {t('whatsapp')}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-heading text-base text-ground">{t('shopHeading')}</h2>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/produkty" className={link}>{tNav('products')}</Link></li>
              <li><Link href="/akce" className={link}>{tNav('events')}</Link></li>
              <li><Link href="/blog" className={link}>{tNav('blog')}</Link></li>
              <li><Link href="/kontakt" className={link}>{tNav('contact')}</Link></li>
            </ul>
          </div>

          <div className="text-sm">
            <h2 className="mb-3 font-heading text-base text-ground">{t('accountHeading')}</h2>
            {authActions}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-ground/20 pt-6 text-xs md:flex-row md:items-center md:justify-between">
          <p>{t('copyright', { year: currentYear })}</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={termsHref} className="underline underline-offset-4 hover:text-ground">{t('terms')}</a>
            <a href={privacyHref} className="underline underline-offset-4 hover:text-ground">{t('privacy')}</a>
            <a href={cookiesHref} className="underline underline-offset-4 hover:text-ground">{t('cookies')}</a>
            <FooterCookiesLink />
          </nav>
        </div>
      </div>
    </footer>
  )
}
