import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'

export default function HomePage() {
  const t = useTranslations('home')
  const tNav = useTranslations('nav')

  return (
    <>
      {/* Hero — logo + tagline, mirroring kurnik-sopa.cz */}
      <section className="px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-5 lg:col-span-4">
            <Image
              src="/logo-kurnik-sopa.svg"
              alt="Kurník & Šopa"
              width={420}
              height={260}
              priority
              className="w-full max-w-sm h-auto"
            />
          </div>
          <h1 className="md:col-span-7 lg:col-span-8 text-3xl md:text-4xl lg:text-5xl leading-tight pb-2">
            {t('hero.title')}
          </h1>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl mb-4">
            {t('featured.title')}
          </h2>
          <p className="text-brand-cream/80 mb-12">
            {t('featured.subtitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Product cards from Payload */}
          </div>
          <div className="mt-12">
            <Link
              href="/produkty"
              className="inline-block bg-brand-cream text-brand-green-deep font-semibold px-8 py-3 rounded-lg hover:bg-brand-cream-dark transition-colors"
            >
              {t('hero.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Highlight blocks — cream cards on green, like the live site */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-brand-cream text-brand-green-deep py-6 px-7">
            <h2 className="text-2xl mb-2">{t('about.title')}</h2>
            <p className="leading-relaxed">{t('about.description')}</p>
            <Link
              href="/o-nas"
              className="inline-block mt-4 font-semibold underline underline-offset-4"
            >
              {tNav('about')}
            </Link>
          </div>
          <div className="bg-brand-cream text-brand-green-deep py-6 px-7">
            <h2 className="text-2xl mb-2">{t('events.title')}</h2>
            <p className="leading-relaxed">{t('events.subtitle')}</p>
            <Link
              href="/akce"
              className="inline-block mt-4 font-semibold underline underline-offset-4"
            >
              {tNav('events')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
