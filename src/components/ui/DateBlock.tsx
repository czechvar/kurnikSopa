type Props = {
  date: string | Date
  locale: 'cs' | 'en'
  className?: string
}

/** Marigold square with the day and short month — the events' visual mark. */
export function DateBlock({ date, locale, className = '' }: Props) {
  const d = new Date(date)
  const tag = locale === 'cs' ? 'cs-CZ' : 'en-GB'
  const day = new Intl.DateTimeFormat(tag, { day: 'numeric', timeZone: 'Europe/Prague' }).format(d)
  const month = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: 'Europe/Prague' })
    .format(d)
    .replace('.', '')
  const full = new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeZone: 'Europe/Prague' }).format(d)
  return (
    <time
      dateTime={d.toISOString()}
      title={full}
      className={`flex w-16 shrink-0 flex-col items-center rounded bg-accent py-2 text-ink-deep ${className}`}
    >
      <span className="font-heading text-2xl font-extrabold leading-none">{day}</span>
      <span className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider">{month}</span>
    </time>
  )
}
