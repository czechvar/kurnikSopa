import Image from 'next/image'
import { getTranslations, getFormatter } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('events')
  const format = await getFormatter()
  const payload = await getPayload()

  const events = await payload.find({
    collection: 'events',
    where: {
      status: { in: ['upcoming', 'full'] },
    },
    sort: 'date',
    limit: 50,
    locale,
  })

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-4xl text-center mb-4">{t('title')}</h1>
        <p className="text-center text-text-secondary mb-12">{t('upcoming')}</p>

        {events.docs.length === 0 ? (
          <p className="text-center text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.docs.map((event) => {
              const eventDate = new Date(event.date)
              const spotsLeft =
                event.capacity && event.registeredCount != null
                  ? event.capacity - event.registeredCount
                  : null

              const firstImage =
                event.images?.[0]?.image && typeof event.images[0].image === 'object'
                  ? event.images[0].image
                  : null
              const imageUrl = getMediaUrl(firstImage)

              return (
                <Link
                  key={event.id}
                  href={{ pathname: '/akce/[slug]', params: { slug: event.slug } }}
                  className="group block bg-brand-cream text-brand-green-deep rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-brand-green-light relative">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={firstImage?.alt || event.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    {event.eventType && (
                      <span className="absolute top-3 left-3 bg-brand-green-deep text-brand-cream text-xs px-2 py-1 rounded-full">
                        {t(`eventType.${event.eventType}`)}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-brand-green font-semibold mb-1">
                      {format.dateTime(eventDate, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {event.startTime && ` · ${event.startTime}`}
                      {event.startTime && event.endTime && `–${event.endTime}`}
                    </div>
                    <h3 className="font-heading text-xl mb-2 group-hover:text-brand-green transition-colors">
                      {event.title}
                    </h3>
                    {event.location && (
                      <p className="text-brand-green-deep/75 text-sm mb-3">
                        {event.location}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {event.price === 0 ? t('free') : `${event.price} Kč`}
                      </span>
                      {event.status === 'full' ? (
                        <span className="text-xs bg-brand-green-deep text-brand-cream px-2 py-1 rounded-full">
                          {t('full')}
                        </span>
                      ) : spotsLeft !== null ? (
                        <span className="text-xs text-brand-green-deep/70">
                          {t('spotsLeft', { count: spotsLeft })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
