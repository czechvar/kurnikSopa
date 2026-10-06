import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { getMediaUrl } from '@/lib/media'
import { Link } from '@/lib/i18n/routing'
import { publishedPostsWhere } from '@/lib/posts/queries'
import { PageHeader } from '@/components/ui/PageHeader'
import { PostCard } from '@/components/blog/PostCard'
import { Illustration } from '@/components/illustrations/Illustration'
import type { Post } from '@/payload-types'

// Scheduled posts become visible when their date passes, so this page cannot be
// frozen at build time.
export const revalidate = 300

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('blog')
  const payload = await getPayload()

  const posts = await payload.find({
    collection: 'posts',
    where: publishedPostsWhere(),
    sort: '-publishedAt',
    limit: 50,
    depth: 1,
    locale,
  })
  const [lead, ...rest] = posts.docs

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('subtitle')} />
      <div className="px-5 py-10 md:py-14">
        {!lead ? (
          <p className="mx-auto max-w-xl text-center text-ink-muted">{t('empty')}</p>
        ) : (
          <div className="mx-auto max-w-5xl">
            <LeadPost post={lead} locale={locale} />
            {rest.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {rest.map((post, i) => (
                  <PostCard key={post.id} post={post} locale={locale} index={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/** The newest post, wide: cover beside the text. */
function LeadPost({ post, locale }: { post: Post; locale: 'cs' | 'en' }) {
  const cover = post.coverImage && typeof post.coverImage === 'object' ? post.coverImage : null
  const imageUrl = getMediaUrl(cover)
  const date = post.publishedAt
    ? new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Prague',
      }).format(new Date(post.publishedAt))
    : null
  return (
    <Link
      href={{ pathname: '/blog/[slug]', params: { slug: post.slug! } }}
      className="group grid overflow-hidden rounded-md border border-line bg-ground transition-colors hover:border-ink md:grid-cols-[1.2fr_1fr]"
    >
      <div className="relative aspect-[4/3] bg-panel-sage md:aspect-auto md:min-h-72">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={cover?.alt || post.title}
            fill
            priority
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Illustration name="goose" className="h-28 w-28 text-ink" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center p-6 md:p-8">
        {date && post.publishedAt && (
          <time dateTime={post.publishedAt} className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {date}
          </time>
        )}
        <h2 className="mt-2 text-3xl leading-tight text-ink group-hover:underline">{post.title}</h2>
        {post.excerpt && <p className="mt-3 leading-relaxed text-ink-muted">{post.excerpt}</p>}
      </div>
    </Link>
  )
}

