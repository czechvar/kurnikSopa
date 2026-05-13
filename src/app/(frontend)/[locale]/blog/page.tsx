import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { getMediaUrl } from '@/lib/media'
import { Link } from '@/lib/i18n/routing'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('blog')
  const payload = await getPayload()

  const posts = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 50,
    depth: 1,
    locale,
  })

  return (
    <div className="py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-4xl text-center mb-4">{t('title')}</h1>
        <p className="text-center text-text-secondary mb-12">{t('subtitle')}</p>

        {posts.docs.length === 0 ? (
          <p className="text-center text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.docs.map((post) => {
              const cover =
                post.coverImage && typeof post.coverImage === 'object'
                  ? post.coverImage
                  : null
              const imageUrl = getMediaUrl(cover)

              const author =
                post.author && typeof post.author === 'object' ? post.author : null

              const categories = Array.isArray(post.categories)
                ? post.categories.filter((c) => typeof c === 'object')
                : []

              return (
                <Link
                  key={post.id}
                  href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }}
                  className="group block bg-brand-cream text-brand-green-deep rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-brand-green-light relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={cover?.alt || post.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}
                  </div>
                  <div className="p-6">
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="text-xs font-semibold text-brand-green uppercase tracking-wide"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="font-heading text-2xl mb-2 group-hover:text-brand-green transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-brand-green-deep/75 mb-3 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-brand-green-deep/70">
                      {author && <span>{author.name}</span>}
                      {author && post.publishedAt && <span>·</span>}
                      {post.publishedAt && (
                        <time dateTime={post.publishedAt}>
                          {formatDate(post.publishedAt, locale)}
                        </time>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string, locale: 'cs' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}
