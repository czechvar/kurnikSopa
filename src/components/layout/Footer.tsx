import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'

export function FooterComponent() {
  const t = useTranslations('footer')
  const tCommon = useTranslations('common')

  const currentYear = new Date().getFullYear()

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

        <div className="border-t border-brand-cream/20 mt-8 pt-8 text-center text-sm">
          <p>{t('copyright', { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  )
}
