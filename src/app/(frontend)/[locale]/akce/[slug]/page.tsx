import Image from 'next/image'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getTranslations, getFormatter } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { getSiteSettings } from '@/lib/site-settings'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

function normalizePhoneHref(phone: string): string {
  const stripped = phone.replace(/\s+/g, '')
  return stripped.startsWith('+') ? stripped : `+420${stripped}`
}

function normalizeWhatsAppHref(phone: string): string {
  // wa.me wants digits only, no `+`
  const stripped = phone.replace(/\s+/g, '').replace(/^\+/, '')
  return stripped.startsWith('420') ? stripped : `420${stripped}`
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations('events')
  const format = await getFormatter()
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    locale: locale as 'cs' | 'en',
  })

  const event = result.docs[0]
  if (!event) notFound()

  const settings = await getSiteSettings()
  const phone = settings.contact?.phone || ''
  const whatsapp = settings.contact?.whatsapp || ''

  const eventDate = new Date(event.date)
  const spotsLeft =
    event.capacity && event.registeredCount != null
      ? event.capacity - event.registeredCount
      : null

  const images =
    event.images
      ?.map((entry: NonNullable<typeof event.images>[number]) =>
        entry.image && typeof entry.image === 'object' ? entry.image : null
      )
      .filter((img): img is NonNullable<typeof img> => img !== null) ?? []
  const hero = images[0] ?? null
  const heroUrl = getMediaUrl(hero)
  const thumbs = images.slice(1)

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/akce"
          className="text-brand-green hover:underline mb-6 inline-block"
        >
          &larr; {t('backToList')}
        </Link>

        {heroUrl && hero && (
          <div className="relative aspect-[16/9] mb-6 rounded-xl overflow-hidden bg-brand-green-light">
            <Image
              src={heroUrl}
              alt={hero.alt || event.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              priority
              className="object-cover"
            />
          </div>
        )}

        {thumbs.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {thumbs.map((img, idx) => {
              const url = getMediaUrl(img)
              if (!url) return null
              return (
                <div
                  key={idx}
                  className="relative aspect-[4/3] w-32 flex-shrink-0 rounded-lg overflow-hidden bg-brand-green-light"
                >
                  <Image
                    src={url}
                    alt={img.alt || event.title}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              )
            })}
          </div>
        )}

        {event.eventType && (
          <span className="inline-block bg-brand-cream text-brand-green-deep text-xs px-3 py-1 rounded-full mb-4">
            {t(`eventType.${event.eventType}`)}
          </span>
        )}

        <h1 className="font-heading text-4xl mb-4">{event.title}</h1>

        <div className="bg-brand-cream text-brand-green-deep rounded-xl p-6 mb-8 space-y-3">
          <div className="flex items-start gap-3">
            <span className="font-medium w-24">{t('when')}:</span>
            <span>
              {format.dateTime(eventDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {event.startTime && `, ${event.startTime}`}
              {event.startTime && event.endTime && `–${event.endTime}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">{t('where')}:</span>
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="font-medium w-24">{t('price')}:</span>
            <span>{event.price === 0 ? t('free') : `${event.price} Kč`}</span>
          </div>
          {event.capacity && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">{t('capacityLabel')}:</span>
              <span>
                {t('capacityCount', { count: event.capacity })}
                {spotsLeft !== null && ` (${t('spotsRemaining', { count: spotsLeft })})`}
              </span>
            </div>
          )}
          {event.registrationDeadline && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">{t('registerBy')}:</span>
              <span>
                {format.dateTime(new Date(event.registrationDeadline), {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {event.status !== 'full' && phone && (
          <div className="flex gap-3 mb-8 flex-wrap">
            <a
              href={`tel:${normalizePhoneHref(phone)}`}
              className="inline-block bg-brand-cream text-brand-green-deep font-semibold px-6 py-3 rounded-lg hover:bg-brand-cream-dark transition-colors"
            >
              {t('registerCta', { phone })}
            </a>
            {whatsapp && (
              <a
                href={`https://wa.me/${normalizeWhatsAppHref(whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-2 border-brand-cream text-brand-cream font-semibold px-6 py-3 rounded-lg hover:bg-brand-cream hover:text-brand-green-deep transition-colors"
              >
                {t('whatsapp')}
              </a>
            )}
          </div>
        )}

        {event.description && (
          <div className="prose prose-lg prose-invert max-w-none">
            <RichText data={event.description} />
          </div>
        )}
      </div>
    </div>
  )
}
