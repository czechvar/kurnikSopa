import type { IllustrationName } from './Illustration'

// Product category slug → illustration shown when a product has no photo.
const BY_CATEGORY: Record<string, IllustrationName> = {
  drubez: 'chicken',
  vejce: 'eggs',
  kralici: 'rabbit',
  zelenina: 'vegetables',
}

export function illustrationForCategory(slug: string | null | undefined): IllustrationName {
  return (slug && BY_CATEGORY[slug]) || 'hen'
}
