import { useTranslations, useLocale } from 'next-intl'
import type { ReactNode } from 'react'
import { FooterCookiesLink } from './FooterCookiesLink'

export function FooterComponent({ authActions }: { authActions?: ReactNode }) {
  const t = useTranslations('footer')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const currentYear = new Date().getFullYear()
  const cookiesHref = locale === 'cs' ? '/cs/cookies' : '/en/cookies'
  const termsHref =
    locale === 'cs' ? '/cs/obchodni-podminky' : '/en/obchodni-podminky'
  const privacyHref =
    locale === 'cs'
      ? '/cs/ochrana-osobnich-udaju'
      : '/en/ochrana-osobnich-udaju'

  return (
    <footer className="bg-brand-green-dark text-brand-cream/80 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl text-brand-cream mb-4">
              {tCommon('farmName')}
            </h3>
            <p className="text-sm leading-relaxed">
              {tCommon('tagline')}
            </p>
            <p className="text-sm mt-4">
              Křepice u Hustopečí, 691 65
            </p>
          </div>

          <div>
            <h3 className="text-xl text-brand-cream mb-4">
              {tCommon('phone')}
            </h3>
            <p className="text-sm">+420 774 801 667</p>
          </div>

          <div>
            <h3 className="text-xl text-brand-cream mb-4">
              {tCommon('email')}
            </h3>
            <p className="text-sm">info@kurnik-sopa.cz</p>
          </div>
        </div>

        <div className="border-t border-brand-cream/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>{t('copyright', { year: currentYear })}</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={termsHref} className="underline hover:text-brand-cream transition-colors">
              {t('terms')}
            </a>
            <a href={privacyHref} className="underline hover:text-brand-cream transition-colors">
              {t('privacy')}
            </a>
            <a href={cookiesHref} className="underline hover:text-brand-cream transition-colors">
              Cookies
            </a>
            <FooterCookiesLink />
            {authActions}
          </nav>
        </div>
      </div>
    </footer>
  )
}
