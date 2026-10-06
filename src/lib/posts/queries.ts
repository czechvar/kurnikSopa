import type { Where } from 'payload'

/**
 * Posts the public may see: published, and not scheduled for a future date.
 *
 * Scheduling is read-time only — there is no cron. A post with a future
 * publishedAt is already "published" in Payload's sense and simply stays hidden
 * until its date passes, which is why every public read site must use this
 * clause rather than filtering on _status alone.
 */
export function publishedPostsWhere(now: Date = new Date()): Where {
  return {
    and: [
      { _status: { equals: 'published' } },
      { publishedAt: { less_than_equal: now.toISOString() } },
    ],
  }
}

export function publishedPostBySlugWhere(slug: string, now: Date = new Date()): Where {
  return {
    and: [{ slug: { equals: slug } }, publishedPostsWhere(now)],
  }
}
