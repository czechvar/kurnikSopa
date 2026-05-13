'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'
import type { Product, ProductCategory } from '@/payload-types'

type Props = {
  products: Product[]
  categories: ProductCategory[]
}

export function ProductsBrowser({ products, categories }: Props) {
  const t = useTranslations('products')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (selectedId == null) return products
    return products.filter((p) => {
      const catId =
        p.category && typeof p.category === 'object' ? p.category.id : p.category
      return catId === selectedId
    })
  }, [products, selectedId])

  return (
    <>
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          aria-pressed={selectedId === null}
          className={
            'px-4 py-2 rounded-full text-sm font-semibold transition-colors ' +
            (selectedId === null
              ? 'bg-brand-cream text-brand-green-deep'
              : 'bg-brand-green-dark text-brand-cream hover:bg-brand-green-light')
          }
        >
          {t('filterAll')}
        </button>
        {categories.map((cat) => {
          const active = selectedId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedId(cat.id)}
              aria-pressed={active}
              className={
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors ' +
                (active
                  ? 'bg-brand-cream text-brand-green-deep'
                  : 'bg-brand-green-dark text-brand-cream hover:bg-brand-green-light')
              }
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((product) => {
          const category =
            product.category && typeof product.category === 'object'
              ? product.category
              : null

          const firstImage =
            product.images?.[0]?.image && typeof product.images[0].image === 'object'
              ? product.images[0].image
              : null
          const imageUrl = getMediaUrl(firstImage)

          return (
            <Link
              key={product.id}
              href={{ pathname: '/produkty/[slug]', params: { slug: product.slug! } }}
              className="group block bg-brand-cream text-brand-green-deep rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="aspect-[4/3] bg-brand-green-light relative overflow-hidden">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={firstImage?.alt || product.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-brand-cream/80 text-sm">Foto</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                {category && (
                  <span className="text-xs font-semibold text-brand-green uppercase tracking-wide">
                    {category.name}
                  </span>
                )}
                <h3 className="font-heading text-xl mt-1 mb-2 group-hover:text-brand-green transition-colors">
                  {product.name}
                </h3>
                {product.shortDescription && (
                  <p className="text-brand-green-deep/75 text-sm mb-3 line-clamp-2">
                    {product.shortDescription}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">
                    {product.price} Kč
                    {product.unit && (
                      <span className="text-sm font-normal text-brand-green-deep/70">
                        /{product.unit}
                      </span>
                    )}
                  </span>
                  {product.seasonal && (
                    <span className="text-xs bg-brand-gold/30 text-brand-green-deep px-2 py-1 rounded-full">
                      {t('seasonal')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
