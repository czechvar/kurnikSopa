import type { Payload } from 'payload'
import type { Post } from '@/payload-types'
import { publishedPostBySlugWhere } from './queries'

/**
 * The post a blog detail page shows. Without preview that is the published
 * version, and only once its date has come. In preview (Next draft mode, which
 * only an admin or editor can switch on) it is the last saved version, draft
 * or scheduled.
 */
export async function findPostBySlug(
  payload: Payload,
  { slug, locale, draft }: { slug: string; locale: 'cs' | 'en'; draft: boolean },
): Promise<Post | null> {
  const result = await payload.find({
    collection: 'posts',
    where: draft ? { slug: { equals: slug } } : publishedPostBySlugWhere(slug),
    draft,
    depth: 2,
    limit: 1,
    locale,
  })
  return result.docs[0] ?? null
}
