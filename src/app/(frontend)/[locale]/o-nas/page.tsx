import { getTranslations } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from '@/lib/payload'
import { PageHeader } from '@/components/ui/PageHeader'

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
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'o-nas' } },
    limit: 1,
    locale,
  })
  const page = result.docs[0]

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
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
