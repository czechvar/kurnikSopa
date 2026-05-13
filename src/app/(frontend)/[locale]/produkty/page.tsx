import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { ProductsBrowser } from '@/components/products/ProductsBrowser'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('products')
  const payload = await getPayload()

  const categories = await payload.find({
    collection: 'product-categories',
    sort: 'name',
    limit: 50,
    locale,
  })

  const products = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    sort: 'name',
    limit: 100,
    depth: 1,
    locale,
  })

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-4xl text-center mb-12">{t('title')}</h1>

        <ProductsBrowser
          products={products.docs}
          categories={categories.docs}
        />
      </div>
    </div>
  )
}
