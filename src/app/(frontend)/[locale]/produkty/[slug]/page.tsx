import { notFound } from 'next/navigation'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'
import { RichText } from '@payloadcms/richtext-lexical/react'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'products',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    depth: 1,
    limit: 1,
  })

  const product = result.docs[0]
  if (!product) notFound()

  const category =
    product.category && typeof product.category === 'object'
      ? product.category
      : null

  return (
    <div className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/produkty"
          className="text-brand-green hover:underline mb-6 inline-block"
        >
          &larr; Zpět na produkty
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Image placeholder */}
          <div className="aspect-square bg-surface-muted rounded-xl flex items-center justify-center">
            <span className="text-text-secondary">Foto produktu</span>
          </div>

          {/* Product info */}
          <div>
            {category && (
              <span className="text-sm font-medium text-brand-green uppercase tracking-wide">
                {category.name}
              </span>
            )}
            <h1 className="font-heading text-3xl mt-2 mb-4">{product.name}</h1>

            <div className="text-3xl font-bold mb-2">
              {product.price} Kč
              {product.unit && (
                <span className="text-lg font-normal text-text-secondary">
                  /{product.unit}
                </span>
              )}
            </div>

            {product.weight && (
              <p className="text-text-secondary text-sm mb-4">
                Váha: {product.weight >= 1000 ? `${product.weight / 1000} kg` : `${product.weight} g`}
              </p>
            )}

            {product.seasonal && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
                <span className="font-medium">Sezónní produkt</span>
                {product.availableFrom && product.availableTo && (
                  <span className="text-text-secondary">
                    {' '}— dostupné {new Date(product.availableFrom).toLocaleDateString('cs-CZ', { month: 'long' })}
                    {' '}až {new Date(product.availableTo).toLocaleDateString('cs-CZ', { month: 'long' })}
                  </span>
                )}
              </div>
            )}

            {product.minimumOrder && product.minimumOrder > 1 && (
              <p className="text-sm text-text-secondary mb-4">
                Minimální objednávka: {product.minimumOrder} {product.unit || 'ks'}
              </p>
            )}

            <div className="flex gap-3 mb-6">
              <a
                href="tel:+420774801667"
                className="inline-block bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                Objednat: 774 801 667
              </a>
              <a
                href="https://wa.me/420774801667"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-2 border-brand-green text-brand-green font-semibold px-6 py-3 rounded-lg hover:bg-brand-green hover:text-white transition-colors"
              >
                WhatsApp
              </a>
            </div>

            {product.shortDescription && (
              <p className="text-text-secondary mb-6">{product.shortDescription}</p>
            )}
          </div>
        </div>

        {/* Full description */}
        {product.description && (
          <div className="mt-12 prose prose-lg max-w-none">
            <h2 className="font-heading text-2xl mb-4">Popis</h2>
            <RichText data={product.description} />
          </div>
        )}
      </div>
    </div>
  )
}
