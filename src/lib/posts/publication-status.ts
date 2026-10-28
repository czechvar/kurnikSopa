export type PublicationStatus = 'draft' | 'scheduled' | 'published'

type Publishable = { _status?: 'draft' | 'published' | null; publishedAt?: string | null }

/**
 * Whether the public sees this version of a post. A post published with a
 * future date is "scheduled": Payload calls it published, but the public
 * cannot see it until the date comes (see `publishedPostsWhere`).
 */
export function publicationStatus(post: Publishable, now: Date = new Date()): PublicationStatus {
  if (post._status !== 'published') return 'draft'
  if (post.publishedAt && new Date(post.publishedAt) > now) return 'scheduled'
  return 'published'
}

const TIME_ZONE = 'Europe/Prague'

function formatDate(iso: string, language: 'cs' | 'en'): { date: string; time: string } {
  const locale = language === 'cs' ? 'cs-CZ' : 'en-GB'
  const at = new Date(iso)
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(at)
  const time = new Intl.DateTimeFormat(locale, {
    hour: language === 'cs' ? 'numeric' : '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(at)
  return { date, time }
}

/**
 * One line for the admin sidebar saying whether the public sees this post.
 * Admin strings live here rather than in next-intl: the admin is Payload's,
 * and Payload picks the language per user.
 */
export function describePublication(
  post: Publishable,
  language: 'cs' | 'en',
  now: Date = new Date(),
): string {
  const status = publicationStatus(post, now)
  if (status === 'draft') {
    return language === 'cs'
      ? 'Ne, tato verze ještě není publikovaná.'
      : 'No, this version is not published yet.'
  }
  const { date, time } = formatDate(post.publishedAt ?? now.toISOString(), language)
  if (status === 'scheduled') {
    return language === 'cs'
      ? `Naplánováno: na webu se objeví ${date} v ${time}.`
      : `Scheduled: appears on the site on ${date} at ${time}.`
  }
  return language === 'cs' ? `Ano, na webu od ${date} ${time}.` : `Yes, on the site since ${date} ${time}.`
}
