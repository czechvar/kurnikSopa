import { notFound } from 'next/navigation'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'
import { RichText } from '@payloadcms/richtext-lexical/react'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const event = result.docs[0]
  if (!event) notFound()

  const eventDate = new Date(event.date)
  const spotsLeft =
    event.capacity && event.registeredCount != null
      ? event.capacity - event.registeredCount
      : null

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/akce"
          className="text-brand-green hover:underline mb-6 inline-block"
        >
          &larr; Zpět na akce
        </Link>

        {event.eventType && (
          <span className="inline-block bg-brand-green text-white text-xs px-3 py-1 rounded-full capitalize mb-4">
            {event.eventType}
          </span>
        )}

        <h1 className="font-heading text-4xl mb-4">{event.title}</h1>

        <div className="bg-surface-muted rounded-xl p-6 mb-8 space-y-3">
          <div className="flex items-start gap-3">
            <span className="font-medium w-24">Kdy:</span>
            <span>
              {eventDate.toLocaleDateString('cs-CZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {event.startTime && `, ${event.startTime}`}
              {event.endTime && `–${event.endTime}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">Kde:</span>
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="font-medium w-24">Cena:</span>
            <span>{event.price === 0 ? 'Zdarma' : `${event.price} Kč`}</span>
          </div>
          {event.capacity && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">Kapacita:</span>
              <span>
                {event.capacity} míst
                {spotsLeft !== null && ` (zbývá ${spotsLeft})`}
              </span>
            </div>
          )}
          {event.registrationDeadline && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">Registrace do:</span>
              <span>
                {new Date(event.registrationDeadline).toLocaleDateString('cs-CZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {event.status !== 'full' && (
          <div className="flex gap-3 mb-8">
            <a
              href="tel:+420774801667"
              className="inline-block bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Registrovat se: 774 801 667
            </a>
            <a
              href="https://wa.me/420774801667"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border-2 border-brand-green text-brand-green font-semibold px-6 py-3 rounded-lg hover:bg-brand-green hover:text-white transition-colors"
            >
              WhatsApp
            </a>
          </div>
        )}

        {event.description && (
          <div className="prose prose-lg max-w-none">
            <RichText data={event.description} />
          </div>
        )}
      </div>
    </div>
  )
}
