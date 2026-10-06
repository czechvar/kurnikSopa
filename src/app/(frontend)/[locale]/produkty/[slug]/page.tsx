import Image from 'next/image'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from '@/lib/payload'
import { getMediaUrl } from '@/lib/media'
import { getSiteSettings } from '@/lib/site-settings'
import { formatPhone, formatPrice } from '@/lib/utils'
import { telHref, whatsappHref } from '@/lib/contact'
import { Link } from '@/lib/i18n/routing'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { buttonClass } from '@/components/ui/button'
import { Illustration } from '@/components/illustrations/Illustration'
import { illustrationForCategory } from '@/components/illustrations/category-map'

type Props = {
  params: Promise<{ locale: 'cs' | 'en'; slug: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations('products')
  const tEvents = await getTranslations('events')
  const payload = await getPayload()
  const { user } = await payload.auth({ headers: await headers() })

  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    depth: 1,
    limit: 1,
    locale,
  })
  const product = result.docs[0]
  if (!product) notFound()

  const settings = await getSiteSettings()
  const phone = settings.contact?.phone
  const whatsapp = settings.contact?.whatsapp

  const category = product.category && typeof product.category === 'object' ? product.category : null
  const firstImage =
    product.images?.[0]?.image && typeof product.images[0].image === 'object' ? product.images[0].image : null
  const imageUrl = getMediaUrl(firstImage)
  const month = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', { month: 'long', timeZone: 'Europe/Prague' }).format(
      new Date(iso),
    )
  const unit = product.unit ? t(`units.${product.unit}`) : null

  return (
    <div className="px-5 py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/produkty" className="mb-6 inline-block text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          &larr; {t('backToList')}
        </Link>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <div className="relative aspect-square overflow-hidden rounded-md bg-panel-blush">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={firstImage?.alt || product.name}
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Illustration name={illustrationForCategory(category?.slug)} className="h-40 w-40 text-ink" />
              </div>
            )}
          </div>

          <div>
            {category && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{category.name}</p>
            )}
            <h1 className="mt-1 text-4xl leading-tight text-ink">{product.name}</h1>

            <p className="mt-4 text-3xl font-bold text-ink-deep">
              {formatPrice(product.price)}
              {unit && <span className="text-lg font-normal text-ink-muted"> / {unit}</span>}
            </p>
            {product.weight && (
              <p className="mt-1 text-sm text-ink-muted">
                {t('weight', {
                  weight: product.weight >= 1000 ? `${product.weight / 1000} kg` : `${product.weight} g`,
                })}
              </p>
            )}

            {product.seasonal && (
              <div className="mt-5 rounded border border-accent bg-accent/25 p-3 text-sm text-ink-deep">
                <span className="font-semibold">{t('seasonalNotice')}</span>
                {product.availableFrom && product.availableTo && (
                  <> — {t('availability', { from: month(product.availableFrom), to: month(product.availableTo) })}</>
                )}
              </div>
            )}

            {product.minimumOrder && product.minimumOrder > 1 && (
              <p className="mt-4 text-sm text-ink-muted">{t('minimumOrder', { count: product.minimumOrder })}</p>
            )}

            <div className="mt-6">
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                minimumOrder={product.minimumOrder ?? 1}
                isLoggedIn={Boolean(user)}
                loginRedirectPath={`/produkty/${product.slug}`}
              />
            </div>

            {(phone || whatsapp) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {phone && (
                  <a href={telHref(phone)} className={buttonClass('outline')}>
                    {t('orderByPhone', { phone: formatPhone(phone) })}
                  </a>
                )}
                {whatsapp && (
                  <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline')}>
                    {tEvents('whatsapp')}
                  </a>
                )}
              </div>
            )}

            {product.shortDescription && <p className="mt-6 leading-relaxed text-ink">{product.shortDescription}</p>}
          </div>
        </div>

        {product.description && (
          <section className="mt-14 border-t border-line pt-10">
            <h2 className="mb-4 text-2xl text-ink">{t('description')}</h2>
            <div className="prose prose-lg max-w-[65ch]">
              <RichText data={product.description} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
