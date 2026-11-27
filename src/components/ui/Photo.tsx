import Image from 'next/image'
import { focalPosition, getMediaUrl } from '@/lib/media'
import type { Media } from '@/payload-types'

type Props = {
  media: Media
  /** Rendered width per breakpoint, so the browser downloads the right size. */
  sizes: string
  /** Load first. Only for the photo that is the largest thing on the page (LCP). */
  priority?: boolean
  className?: string
}

/**
 * A media-library photo filling its parent, which sets the shape and is
 * `position: relative`. Cropped around the focal point chosen in the admin,
 * described by the photo's own alt text in the page's language.
 */
export function Photo({ media, sizes, priority, className = '' }: Props) {
  const src = getMediaUrl(media)
  if (!src) return null
  return (
    <Image
      src={src}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
      style={{ objectPosition: focalPosition(media) }}
    />
  )
}
