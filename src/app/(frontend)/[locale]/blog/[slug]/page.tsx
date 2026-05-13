import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from '@/lib/payload'
import { getMediaUrl } from '@/lib/media'
import { Link } from '@/lib/i18n/routing'

type Props = {
  params: Promise<{ locale: 'cs' | 'en'; slug: string }>
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations('blog')
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    depth: 2,
    limit: 1,
    locale,
  })

  const post = result.docs[0]
  if (!post) notFound()

  const cover =
    post.coverImage && typeof post.coverImage === 'object' ? post.coverImage : null
  const coverUrl = getMediaUrl(cover)

  const author =
    post.author && typeof post.author === 'object' ? post.author : null
  const avatar =
    author?.avatar && typeof author.avatar === 'object' ? author.avatar : null
  const avatarUrl = getMediaUrl(avatar)

  const categories = Array.isArray(post.categories)
    ? post.categories.filter((c) => typeof c === 'object')
    : []

  return (
    <article className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="text-brand-green hover:underline mb-6 inline-block"
        >
          &larr; {t('backToList')}
        </Link>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="text-xs font-medium text-brand-green uppercase tracking-wide"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        <h1 className="font-heading text-4xl mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-text-secondary mb-8">
          {author && (
            <div className="flex items-center gap-2">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={avatar?.alt || author.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span>{author.name}</span>
              {author.role && <span className="text-text-secondary">· {author.role}</span>}
            </div>
          )}
          {author && post.publishedAt && <span>·</span>}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt, locale)}
            </time>
          )}
        </div>

        {coverUrl && (
          <div className="aspect-[16/9] bg-surface-muted rounded-xl relative overflow-hidden mb-10">
            <img
              src={coverUrl}
              alt={cover?.alt || post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}

        {post.excerpt && (
          <p className="text-lg text-text-secondary mb-8 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {post.content && (
          <div className="prose prose-lg max-w-none">
            <RichText data={post.content} />
          </div>
        )}
      </div>
    </article>
  )
}

function formatDate(iso: string, locale: 'cs' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}
