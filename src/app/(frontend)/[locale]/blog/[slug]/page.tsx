import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { getPayload } from '@/lib/payload'
import { getMediaUrl } from '@/lib/media'
import { Link } from '@/lib/i18n/routing'
import { SITE_URL, absoluteUrl } from '@/lib/site'
import { publishedPostBySlugWhere } from '@/lib/posts/queries'

// Scheduled posts become visible when their date passes.
export const revalidate = 300

type Props = {
  params: Promise<{ locale: 'cs' | 'en'; slug: string }>
}

async function fetchPost(slug: string, locale: 'cs' | 'en') {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'posts',
    where: publishedPostBySlugWhere(slug),
    depth: 2,
    limit: 1,
    locale,
  })
  return result.docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await fetchPost(slug, locale)
  if (!post) return {}

  const seo = post.seo ?? {}
  const title = seo.metaTitle || post.title
  const description = seo.metaDescription || post.excerpt || undefined

  const ogImageRaw =
    seo.metaImage && typeof seo.metaImage === 'object'
      ? seo.metaImage
      : post.coverImage && typeof post.coverImage === 'object'
        ? post.coverImage
        : null
  const ogImageUrl = getMediaUrl(ogImageRaw)
  const ogImageAbsolute = ogImageUrl ? absoluteUrl(ogImageUrl) : null

  const canonicalPath = `/${locale}/blog/${slug}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        cs: `/cs/blog/${slug}`,
        en: `/en/blog/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: absoluteUrl(canonicalPath),
      locale: locale === 'cs' ? 'cs_CZ' : 'en_GB',
      publishedTime: post.publishedAt || undefined,
      images: ogImageAbsolute ? [{ url: ogImageAbsolute }] : undefined,
    },
    twitter: {
      card: ogImageAbsolute ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImageAbsolute ? [ogImageAbsolute] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations('blog')
  const post = await fetchPost(slug, locale)
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.seo?.metaDescription || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    image: coverUrl ? absoluteUrl(coverUrl) : undefined,
    author: author
      ? {
          '@type': 'Person',
          name: author.name,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Kurník & Šopa',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-kurnik-sopa.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${locale}/blog/${slug}`,
    },
    inLanguage: locale === 'cs' ? 'cs-CZ' : 'en-GB',
  }

  return (
    <article className="px-5 py-10 md:py-14">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-[65ch]">
        <Link
          href="/blog"
          className="mb-6 inline-block text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
        >
          &larr; {t('backToList')}
        </Link>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        <h1 className="mb-4 text-4xl leading-tight text-ink md:text-5xl">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-ink-muted mb-8">
          {author && (
            <div className="flex items-center gap-2">
              {avatarUrl && (
                <Image
                  src={avatarUrl}
                  alt={avatar?.alt || author.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span>{author.name}</span>
              {author.role && <span className="text-ink-muted">· {author.role}</span>}
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
          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-md bg-panel-sage">
            <Image
              src={coverUrl}
              alt={cover?.alt || post.title}
              fill
              priority
              sizes="(min-width: 768px) 65ch, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {post.excerpt && (
          <p className="text-lg text-ink-muted mb-8 leading-relaxed">
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
    timeZone: 'Europe/Prague',
  }).format(new Date(iso))
}
