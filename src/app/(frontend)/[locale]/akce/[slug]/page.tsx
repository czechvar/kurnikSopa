import Image from 'next/image'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getTranslations, getFormatter } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { getSiteSettings } from '@/lib/site-settings'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'
import type { Media } from '@/payload-types'
import { formatPhone, formatPrice } from '@/lib/utils'
import { telHref, whatsappHref } from '@/lib/contact'
import { buttonClass } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { DateBlock } from '@/components/ui/DateBlock'

type Props = {
  params: Promise<{ locale: string; slug: string }>
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

  const images: Media[] = (event.images ?? [])
    .map((entry): Media | null =>
      entry.image && typeof entry.image === 'object' ? entry.image : null,
    )
    .filter((img): img is Media => img !== null)
  const hero = images[0] ?? null
  const heroUrl = getMediaUrl(hero)
  const thumbs = images.slice(1)

  const facts: Array<[string, string]> = [
    [
      t('when'),
      format.dateTime(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
        (event.startTime ? `, ${event.startTime}` : '') +
        (event.startTime && event.endTime ? `–${event.endTime}` : ''),
    ],
    ...(event.location ? ([[t('where'), event.location]] as Array<[string, string]>) : []),
    [t('price'), !event.price ? t('free') : formatPrice(event.price)],
    ...(event.capacity
      ? ([
          [
            t('capacityLabel'),
            t('capacityCount', { count: event.capacity }) +
              (spotsLeft !== null ? ` (${t('spotsRemaining', { count: spotsLeft })})` : ''),
          ],
        ] as Array<[string, string]>)
      : []),
    ...(event.registrationDeadline
      ? ([
          [
            t('registerBy'),
            format.dateTime(new Date(event.registrationDeadline), { day: 'numeric', month: 'long', year: 'numeric' }),
          ],
        ] as Array<[string, string]>)
      : []),
  ]

  return (
    <div className="px-5 py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/akce" className="mb-6 inline-block text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          &larr; {t('backToList')}
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <DateBlock date={event.date} locale={locale as 'cs' | 'en'} />
              <div>
                {event.eventType && <Badge>{t(`eventType.${event.eventType}`)}</Badge>}
                <h1 className="mt-1 text-4xl leading-tight text-ink">{event.title}</h1>
              </div>
            </div>

            {heroUrl && hero && (
              <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-md bg-panel-sage">
                <Image
                  src={heroUrl}
                  alt={hero.alt || event.title}
                  fill
                  sizes="(min-width: 1024px) 640px, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
            )}

            {thumbs.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {thumbs.map((img, idx) => {
                  const url = getMediaUrl(img)
                  if (!url) return null
                  return (
                    <div key={idx} className="relative aspect-[4/3] w-32 flex-shrink-0 overflow-hidden rounded bg-panel-sage">
                      <Image src={url} alt={img.alt || event.title} fill sizes="128px" className="object-cover" />
                    </div>
                  )
                })}
              </div>
            )}

            {event.description && (
              <div className="prose prose-lg mt-8 max-w-[65ch]">
                <RichText data={event.description} />
              </div>
            )}
          </div>

          {/* On phones this panel follows the title block; from lg it sits beside the text. */}
          <aside className="order-first self-start rounded-md bg-panel-sage p-6 lg:sticky lg:top-24 lg:order-none">
            <h2 className="mb-4 text-lg text-ink">{t('details')}</h2>
            <dl className="space-y-3 text-sm">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold text-ink-muted">{label}</dt>
                  <dd className="text-ink-deep">{value}</dd>
                </div>
              ))}
            </dl>
            {event.status === 'full' ? (
              <p className="mt-6 font-semibold text-ink-deep">{t('full')}</p>
            ) : (
              phone && (
                <div className="mt-6 flex flex-col gap-3">
                  <a href={telHref(phone)} className={buttonClass('primary', 'md', 'w-full')}>
                    {t('registerCta', { phone: formatPhone(phone) })}
                  </a>
                  {whatsapp && (
                    <a
                      href={whatsappHref(whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClass('outline', 'md', 'w-full')}
                    >
                      {t('whatsapp')}
                    </a>
                  )}
                </div>
              )
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
