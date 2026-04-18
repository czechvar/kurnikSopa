import { useTranslations } from 'next-intl'

export default function BlogPage() {
  const t = useTranslations('nav')

  const blogTopics = [
    {
      title: 'Rozdíl ve kvalitě výrobků z pasených zvířat',
      description: 'Proč je maso a vejce z pastevního chovu jiné než z intenzivního.',
    },
    {
      title: 'Eko zemědělství vs. regenerativní',
      description: 'V čem se liší ekologické a regenerativní zemědělství a proč na tom záleží.',
    },
    {
      title: 'Na co si dát pozor při nákupu „faremních produktů"',
      description: 'Jak poznat opravdu kvalitní produkty od marketingových triků.',
    },
    {
      title: 'Recepty',
      description: 'Jednoduché recepty z našich produktů — kuřecí, králičí, husí a zelenina.',
    },
  ]

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-4xl mb-4">{t('blog')}</h1>
        <p className="text-text-secondary mb-12">
          Připravujeme pro vás články o regenerativním zemědělství, kvalitě potravin a receptech.
        </p>

        <div className="space-y-6">
          {blogTopics.map((topic) => (
            <div
              key={topic.title}
              className="bg-surface-muted rounded-xl p-6"
            >
              <h2 className="font-heading text-xl mb-2">{topic.title}</h2>
              <p className="text-text-secondary">{topic.description}</p>
              <span className="inline-block mt-3 text-sm text-brand-green font-medium">
                Již brzy
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
