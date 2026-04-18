import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'

export default async function ProductsPage() {
  const t = await getTranslations('products')
  const tCommon = await getTranslations('common')
  const payload = await getPayload()

  const categories = await payload.find({
    collection: 'product-categories',
    sort: 'name',
    limit: 50,
  })

  const products = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    sort: 'name',
    limit: 100,
    depth: 1,
  })

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-4xl text-center mb-4">{t('title')}</h1>
        <p className="text-center text-text-secondary mb-12">{t('filterAll')}</p>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.docs.map((cat) => (
            <span
              key={cat.id}
              className="px-4 py-2 bg-surface-muted rounded-full text-sm font-medium"
            >
              {cat.name}
            </span>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.docs.map((product) => {
            const category =
              product.category && typeof product.category === 'object'
                ? product.category
                : null

            return (
              <Link
                key={product.id}
                href={`/produkty/${product.slug}` as '/produkty/[slug]'}
                className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="aspect-[4/3] bg-surface-muted flex items-center justify-center">
                  <span className="text-text-secondary text-sm">Foto</span>
                </div>
                <div className="p-5">
                  {category && (
                    <span className="text-xs font-medium text-brand-green uppercase tracking-wide">
                      {category.name}
                    </span>
                  )}
                  <h3 className="font-heading text-xl mt-1 mb-2 group-hover:text-brand-green transition-colors">
                    {product.name}
                  </h3>
                  {product.shortDescription && (
                    <p className="text-text-secondary text-sm mb-3 line-clamp-2">
                      {product.shortDescription}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {product.price} Kč
                      {product.unit && (
                        <span className="text-sm font-normal text-text-secondary">
                          /{product.unit}
                        </span>
                      )}
                    </span>
                    {product.seasonal && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                        {t('seasonal')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
