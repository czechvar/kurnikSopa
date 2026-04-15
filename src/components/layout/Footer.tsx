import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'

export function FooterComponent() {
  const t = useTranslations('footer')
  const tCommon = useTranslations('common')

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-brand-green-dark text-brand-cream/80">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Farm info */}
          <div>
            <h3 className="font-heading text-xl text-brand-cream mb-4">
              {tCommon('farmName')}
            </h3>
            <p className="text-sm leading-relaxed">
              {tCommon('tagline')}
            </p>
            <p className="text-sm mt-4">
              Křepice u Hustopečí, 691 65
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-heading text-xl text-brand-cream mb-4">
              {/* Quick links */}
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/produkty" className="hover:text-brand-cream transition-colors">
                {tCommon('farmName')}
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-xl text-brand-cream mb-4">
              {tCommon('phone')}
            </h3>
            <p className="text-sm">+420 774 801 667</p>
          </div>
        </div>

        <div className="border-t border-brand-cream/20 mt-8 pt-8 text-center text-sm">
          <p>{t('copyright', { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  )
}
