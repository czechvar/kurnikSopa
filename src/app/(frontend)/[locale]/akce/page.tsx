import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { PageHeader } from '@/components/ui/PageHeader'
import { EventRow } from '@/components/events/EventRow'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('events')
  const payload = await getPayload()

  const events = await payload.find({
    collection: 'events',
    where: { status: { in: ['upcoming', 'full'] } },
    sort: 'date',
    limit: 50,
    locale,
  })

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <div className="px-5 py-10 md:py-14">
        {events.docs.length === 0 ? (
          <p className="mx-auto max-w-xl text-center text-ink-muted">{t('empty')}</p>
        ) : (
          <ul className="mx-auto max-w-3xl space-y-4">
            {events.docs.map((event) => (
              <li key={event.id}>
                <EventRow event={event} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
