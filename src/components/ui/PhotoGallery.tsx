import type { Media } from '@/payload-types'
import { Photo } from './Photo'

type Props = {
  photos: Media[]
  /** Accessible name of the list, e.g. "Fotky z farmy". */
  label: string
  className?: string
}

/**
 * Farm photos in a grid: two across on phones, three from tablets up. With an
 * odd count the first photo spans the phone row, so no row is left half empty.
 */
export function PhotoGallery({ photos, label, className = '' }: Props) {
  if (photos.length === 0) return null
  const leadSpans = photos.length % 2 === 1

  return (
    <ul aria-label={label} className={`grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 ${className}`}>
      {photos.map((photo, i) => {
        const wide = leadSpans && i === 0
        return (
          <li
            key={`${photo.id}-${i}`}
            className={`relative aspect-[4/3] overflow-hidden rounded-md bg-ground-sunken ${wide ? 'col-span-2 md:col-span-1' : ''}`}
          >
            <Photo
              media={photo}
              sizes={`(min-width: 1064px) 340px, (min-width: 768px) 33vw, ${wide ? '100vw' : '50vw'}`}
            />
          </li>
        )
      })}
    </ul>
  )
}
