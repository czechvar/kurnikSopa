import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductCard } from '@/components/products/ProductCard'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ kategorie?: string }>
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { kategorie } = await searchParams
  const t = await getTranslations('products')
  const payload = await getPayload()

  const categories = await payload.find({
    collection: 'product-categories',
    sort: 'name',
    limit: 50,
    locale,
  })
  const active = categories.docs.find((c) => c.slug === kategorie) ?? null

  const products = await payload.find({
    collection: 'products',
    where: {
      and: [
        { status: { equals: 'published' } },
        ...(active ? [{ category: { equals: active.id } }] : []),
      ],
    },
    sort: 'name',
    limit: 100,
    depth: 1,
    locale,
  })

  // Filtering is a plain link with ?kategorie=, so it works without JavaScript
  // and a filtered list can be shared.
  const chip = (current: boolean) =>
    'rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ' +
    (current ? 'border-ink bg-ink text-ground' : 'border-ink text-ink hover:bg-ground-sunken')

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <div className="px-5 py-10 md:py-14">
        <nav aria-label={t('filterLabel')} className="mx-auto mb-10 flex max-w-5xl flex-wrap justify-center gap-2">
          <Link href="/produkty" aria-current={active ? undefined : 'page'} className={chip(!active)}>
            {t('filterAll')}
          </Link>
          {categories.docs.map((cat) => (
            <Link
              key={cat.id}
              href={{ pathname: '/produkty', query: { kategorie: cat.slug } }}
              aria-current={active?.id === cat.id ? 'page' : undefined}
              className={chip(active?.id === cat.id)}
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {products.docs.length === 0 ? (
          <p className="text-center text-ink-muted">{t('empty')}</p>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.docs.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
