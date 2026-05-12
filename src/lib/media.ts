export function getMediaUrl(media: { url?: string | null; filename?: string | null } | null | undefined): string | null {
  if (!media) return null
  if (media.url) return media.url
  if (media.filename) return `/api/media/file/${media.filename}`
  return null
}
