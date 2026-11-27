import { getTranslations } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from '@/lib/payload'
import { PageHeader } from '@/components/ui/PageHeader'
import { Photo } from '@/components/ui/Photo'
import { PhotoGallery } from '@/components/ui/PhotoGallery'
import { ABOUT_PAGE_SLUG } from '@/collections/Pages'
import { populatedMedia, populatedMediaList } from '@/lib/media'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

// Figures are data, not copy: the labels are translated, the numbers are not.
const STATS = [
  { value: '2018', label: 'since' },
  { value: '6 ha', label: 'area' },
  { value: '5×', label: 'batches' },
  { value: '100 %', label: 'gmo' },
] as const

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('about')
  const tCommon = await getTranslations('common')
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: ABOUT_PAGE_SLUG } },
    limit: 1,
    depth: 1,
    locale,
  })
  const page = result.docs[0]
  const cover = populatedMedia(page?.heroImage)
  const gallery = populatedMediaList(page?.gallery)

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      {cover && (
        <div className="px-5 pt-10 md:pt-14">
          <div className="relative mx-auto aspect-[4/3] max-w-5xl overflow-hidden rounded-md bg-ground-sunken sm:aspect-[16/9] md:aspect-[21/9]">
            <Photo media={cover} sizes="(min-width: 1064px) 1024px, calc(100vw - 40px)" priority />
          </div>
        </div>
      )}
      <div className="px-5 py-10 md:py-14">
        <div className="mx-auto max-w-[65ch]">
          {page?.content ? (
            <div className="prose prose-lg max-w-none">
              <RichText data={page.content} />
            </div>
          ) : (
            <p className="text-lg text-ink">{t('fallback')}</p>
          )}
        </div>

        <PhotoGallery photos={gallery} label={tCommon('farmPhotos')} className="mx-auto mt-14 max-w-5xl" />

        <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 border-y border-line md:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col-reverse px-4 py-6 text-center ${i % 2 === 0 ? 'border-r border-line' : ''} ${
                i < 2 ? 'border-b border-line md:border-b-0' : ''
              } ${i === 1 ? 'md:border-r' : ''}`}
            >
              <dt className="mt-1 text-sm text-ink-muted">{t(`stats.${stat.label}`)}</dt>
              <dd className="font-heading text-4xl font-extrabold text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}
