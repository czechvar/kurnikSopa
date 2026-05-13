type MediaSize = { url?: string | null; filename?: string | null }
type Media = {
  url?: string | null
  filename?: string | null
  sizes?: {
    hero?: MediaSize | null
    card?: MediaSize | null
    thumbnail?: MediaSize | null
  } | null
}

export function getMediaUrl(media: Media | null | undefined): string | null {
  if (!media) return null
  if (media.sizes?.hero?.url) return media.sizes.hero.url
  if (media.url) return media.url
  if (media.filename) return `/api/media/file/${media.filename}`
  return null
}
