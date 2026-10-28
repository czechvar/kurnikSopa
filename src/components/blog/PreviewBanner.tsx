import { getTranslations } from 'next-intl/server'
import type { PublicationStatus } from '@/lib/posts/publication-status'

type Props = {
  status: PublicationStatus
  publishedAt: string | null | undefined
  locale: 'cs' | 'en'
}

/**
 * Shown above a post opened from the admin's Preview button, so the editor
 * never mistakes a draft for the live page, and can leave draft mode again.
 */
export async function PreviewBanner({ status, publishedAt, locale }: Props) {
  const t = await getTranslations('blog.preview')
  const date = publishedAt ? formatDateTime(publishedAt, locale) : ''

  return (
    <aside
      aria-label={t('label')}
      className="mb-8 rounded-md border border-accent-strong bg-accent px-4 py-3 text-sm text-ink-deep"
    >
      <p className="font-semibold">
        {t('label')}: {t(status, { date })}
      </p>
      <p className="mt-1">{t('savedOnly')}</p>
      {/* A plain link: the exit route lives under /api, outside the locale routing. */}
      <a
        href={`/api/preview/exit?locale=${locale}`}
        className="mt-2 inline-block font-semibold underline underline-offset-2"
      >
        {t('exit')}
      </a>
    </aside>
  )
}

function formatDateTime(iso: string, locale: 'cs' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Europe/Prague',
  }).format(new Date(iso))
}
