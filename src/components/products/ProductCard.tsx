import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'
import { formatPrice } from '@/lib/utils'
import { availabilityOf } from '@/lib/products/availability'
import { Illustration } from '@/components/illustrations/Illustration'
import { illustrationForCategory } from '@/components/illustrations/category-map'
import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/payload-types'

type Props = {
  product: Product
  /** Alternates the tinted panel behind products without a photo. */
  index?: number
}

export async function ProductCard({ product, index = 0 }: Props) {
  const t = await getTranslations('products')
  const category = product.category && typeof product.category === 'object' ? product.category : null
  const firstImage =
    product.images?.[0]?.image && typeof product.images[0].image === 'object'
      ? product.images[0].image
      : null
  const imageUrl = getMediaUrl(firstImage)
  const availability = availabilityOf(product)

  return (
    <Link
      href={{ pathname: '/produkty/[slug]', params: { slug: product.slug! } }}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-ground transition-colors hover:border-ink"
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden ${index % 2 ? 'bg-panel-sage' : 'bg-panel-blush'}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={firstImage?.alt || product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Illustration name={illustrationForCategory(category?.slug)} className="h-24 w-24 text-ink" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {category && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{category.name}</p>
        )}
        <h3 className="mt-1 text-lg leading-snug text-ink">{product.name}</h3>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="font-bold text-ink-deep">
            {formatPrice(product.price)}
            {product.unit && (
              <span className="text-sm font-normal text-ink-muted"> / {t(`units.${product.unit}`)}</span>
            )}
          </p>
          {product.soldBy === 'batch' ? (
            <Badge>{t('bookable')}</Badge>
          ) : !availability.available ? (
            <Badge className="bg-ground-sunken text-ink-muted">{t(availability.reason)}</Badge>
          ) : product.seasonal ? (
            <Badge>{t('seasonal')}</Badge>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
