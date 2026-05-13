import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { RichText } from '@payloadcms/richtext-lexical/react'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

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
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-4xl mb-8">{t('title')}</h1>

        {page?.content ? (
          <div className="prose prose-lg prose-invert max-w-none">
            <RichText data={page.content} />
          </div>
        ) : (
          <p className="text-text-secondary">
            Jsme malá regenerativní farma v Křepicích u Hustopečí.
          </p>
        )}

        {/* Farm stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
          {[
            { number: '2018', label: 'Od roku' },
            { number: '6 ha', label: 'Plocha farmy' },
            { number: '5×', label: 'Turnusů kuřat ročně' },
            { number: '100%', label: 'Bez GMO krmiv' },
          ].map((stat) => (
            <div key={stat.label} className="text-center bg-brand-cream text-brand-green-deep rounded-xl p-6">
              <div className="font-heading text-3xl mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-brand-green-deep/75">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
