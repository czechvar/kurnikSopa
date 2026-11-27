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

/**
 * The photo in an upload field, or null when there is nothing to show: an
 * empty field, a relation read without depth (just an id), or a record whose
 * file is gone. Callers fall back to an illustration on null.
 */
export function populatedMedia<T extends Media>(value: T | number | string | null | undefined): T | null {
  if (!value || typeof value !== 'object') return null
  return getMediaUrl(value) ? value : null
}

/** The showable photos of a hasMany upload field, in the order set in the admin. */
export function populatedMediaList<T extends Media>(
  values: ReadonlyArray<T | number | string | null | undefined> | null | undefined,
): T[] {
  return (values ?? []).flatMap((value) => {
    const media = populatedMedia(value)
    return media ? [media] : []
  })
}

/** CSS object-position that keeps the focal point chosen in the admin in frame. */
export function focalPosition(media: { focalX?: number | null; focalY?: number | null }): string {
  return `${media.focalX ?? 50}% ${media.focalY ?? 50}%`
}
