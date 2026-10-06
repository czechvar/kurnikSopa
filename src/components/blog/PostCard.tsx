import Image from 'next/image'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'
import { Illustration } from '@/components/illustrations/Illustration'
import type { Post } from '@/payload-types'

type Props = {
  post: Post
  locale: 'cs' | 'en'
  index?: number
}

const FALLBACK = ['goose', 'microgreens', 'hen'] as const

export function PostCard({ post, locale, index = 0 }: Props) {
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
      className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-ground transition-colors hover:border-ink"
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${index % 2 ? 'bg-panel-blush' : 'bg-panel-sage'}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={cover?.alt || post.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Illustration name={FALLBACK[index % FALLBACK.length]} className="h-24 w-24 text-ink" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {date && post.publishedAt && (
          <time dateTime={post.publishedAt} className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {date}
          </time>
        )}
        <h3 className="mt-1 text-lg leading-snug text-ink">{post.title}</h3>
        {post.excerpt && <p className="mt-1 line-clamp-3 text-sm text-ink-muted">{post.excerpt}</p>}
      </div>
    </Link>
  )
}
