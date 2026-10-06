import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { DateBlock } from '@/components/ui/DateBlock'
import type { Event } from '@/payload-types'

type Props = {
  event: Event
  locale: 'cs' | 'en'
}

/** One event in the list. The marigold date block is the visual — no photo needed. */
export async function EventRow({ event, locale }: Props) {
  const t = await getTranslations('events')
  const spotsLeft =
    event.capacity && event.registeredCount != null ? event.capacity - event.registeredCount : null
  const weekday = new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
    weekday: 'long',
    timeZone: 'Europe/Prague',
  }).format(new Date(event.date))
  const time = event.startTime ? `${event.startTime}${event.endTime ? `–${event.endTime}` : ''}` : null

  return (
    <Link
      href={{ pathname: '/akce/[slug]', params: { slug: event.slug } }}
      className="group flex items-center gap-4 rounded-md border border-line bg-ground p-4 transition-colors hover:border-ink md:gap-6 md:p-5"
    >
      <DateBlock date={event.date} locale={locale} />
      <div className="min-w-0 flex-1">
        {event.eventType && <Badge className="mb-1">{t(`eventType.${event.eventType}`)}</Badge>}
        <h2 className="text-xl leading-snug text-ink group-hover:underline md:text-2xl">{event.title}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {[weekday, time, event.location].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-bold text-ink-deep">{!event.price ? t('free') : formatPrice(event.price)}</p>
        <p className="text-sm text-ink-muted">
          {event.status === 'full' ? t('full') : spotsLeft !== null ? t('spotsLeft', { count: spotsLeft }) : null}
        </p>
      </div>
    </Link>
  )
}
