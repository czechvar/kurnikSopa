import type { CollectionBeforeChangeHook } from 'payload'

/**
 * A post published with an empty date would be hidden by publishedPostsWhere,
 * which looks like "publishing did nothing". Fill it with now instead. An
 * author-supplied date — including a future one, which is how scheduling
 * works — is left untouched.
 *
 * `data` holds only what this request sent, so a date already saved on the
 * document counts too: publishing a dated draft with `{ _status: 'published' }`
 * alone must not overwrite it.
 */
export const fillPublishedAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data._status !== 'published') return data
  const date = data.publishedAt === undefined ? originalDoc?.publishedAt : data.publishedAt
  if (date) return data
  return { ...data, publishedAt: new Date().toISOString() }
}
