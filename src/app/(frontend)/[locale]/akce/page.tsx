import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'

export default async function EventsPage() {
  const t = await getTranslations('events')
  const payload = await getPayload()

  const events = await payload.find({
    collection: 'events',
    where: {
      status: { in: ['upcoming', 'full'] },
    },
    sort: 'date',
    limit: 50,
  })

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-4xl text-center mb-4">{t('title')}</h1>
        <p className="text-center text-text-secondary mb-12">{t('upcoming')}</p>

        {events.docs.length === 0 ? (
          <p className="text-center text-text-secondary">
            Momentálně nejsou naplánované žádné akce. Sledujte nás na sociálních sítích.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.docs.map((event) => {
              const eventDate = new Date(event.date)
              const spotsLeft =
                event.capacity && event.registeredCount != null
                  ? event.capacity - event.registeredCount
                  : null

              return (
                <Link
                  key={event.id}
                  href={{ pathname: '/akce/[slug]', params: { slug: event.slug } }}
                  className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-surface-muted flex items-center justify-center relative">
                    <span className="text-text-secondary text-sm">Foto</span>
                    {event.eventType && (
                      <span className="absolute top-3 left-3 bg-brand-green text-white text-xs px-2 py-1 rounded-full capitalize">
                        {event.eventType}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-brand-green font-medium mb-1">
                      {eventDate.toLocaleDateString('cs-CZ', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {event.startTime && ` · ${event.startTime}`}
                      {event.endTime && `–${event.endTime}`}
                    </div>
                    <h3 className="font-heading text-xl mb-2 group-hover:text-brand-green transition-colors">
                      {event.title}
                    </h3>
                    {event.location && (
                      <p className="text-text-secondary text-sm mb-3">
                        {event.location}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {event.price === 0 ? t('free') : `${event.price} Kč`}
                      </span>
                      {event.status === 'full' ? (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          {t('full')}
                        </span>
                      ) : spotsLeft !== null ? (
                        <span className="text-xs text-text-secondary">
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
