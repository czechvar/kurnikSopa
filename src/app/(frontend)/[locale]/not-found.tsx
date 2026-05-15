import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-5xl md:text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">{t('body')}</p>
      <Link
        href="/"
        className="inline-block bg-brand-cream text-brand-green-deep font-semibold px-6 py-3 rounded-lg hover:bg-brand-cream-dark transition-colors"
      >
        {t('home')}
      </Link>
    </div>
  )
}
