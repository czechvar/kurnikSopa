/**
 * Get the public URL for a media item.
 * Payload stores urls as /api/media/file/filename but files are
 * served statically from /media/filename via Next.js public dir.
 */
export function getMediaUrl(media: { url?: string | null; filename?: string | null } | null | undefined): string | null {
  if (!media) return null
  if (media.filename) return `/media/${media.filename}`
  if (media.url) return media.url
  return null
}
