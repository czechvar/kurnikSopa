import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'

export default function HomePage() {
  const t = useTranslations('home')
  const tNav = useTranslations('nav')

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-brand-green text-brand-cream py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-4xl md:text-6xl mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl mb-8 text-brand-cream/90">
            {t('hero.subtitle')}
          </p>
          <Link
            href="/produkty"
            className="inline-block bg-brand-cream text-brand-green font-semibold px-8 py-3 rounded-lg hover:bg-brand-cream-dark transition-colors"
          >
            {t('hero.cta')}
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl text-center mb-4">
            {t('featured.title')}
          </h2>
          <p className="text-center text-text-secondary mb-12">
            {t('featured.subtitle')}
          </p>
          {/* Product grid will be populated from Payload */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Placeholder for ProductCard components */}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-6 bg-surface-muted">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl mb-6">
            {t('about.title')}
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            {t('about.description')}
          </p>
          <Link
            href="/o-nas"
            className="inline-block mt-8 border-2 border-brand-green text-brand-green font-semibold px-8 py-3 rounded-lg hover:bg-brand-green hover:text-white transition-colors"
          >
            {tNav('about')}
          </Link>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl text-center mb-4">
            {t('events.title')}
          </h2>
          <p className="text-center text-text-secondary mb-12">
            {t('events.subtitle')}
          </p>
          {/* Event cards will be populated from Payload */}
        </div>
      </section>
    </>
  )
}
