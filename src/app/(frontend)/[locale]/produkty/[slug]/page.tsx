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
import { availabilityOf } from '@/lib/products/availability'
import { findBookableBatches, remainingUnits } from '@/lib/batches/queries'
import { formatDay } from '@/lib/orders/orderEmails'
import { Link } from '@/lib/i18n/routing'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { BatchBookingForm, type BatchOption } from '@/components/products/BatchBookingForm'
import { buttonClass } from '@/components/ui/button'
import { Illustration } from '@/components/illustrations/Illustration'
import { illustrationForCategory } from '@/components/illustrations/category-map'
import type { PickupPoint } from '@/payload-types'

type Props = {
  params: Promise<{ locale: 'cs' | 'en'; slug: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations('products')
  const tEvents = await getTranslations('events')
  const payload = await getPayload()

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
  const isBatchProduct = product.soldBy === 'batch'
  const availability = availabilityOf(product)

  // Batch products are booked, not carted: load what can be booked and who is asking.
  let batchOptions: BatchOption[] = []
  let viewer: { firstName: string; lastName: string; phone: string; email: string } | null = null
  if (isBatchProduct) {
    const { user } = await payload.auth({ headers: await headers() })
    if (user) viewer = { firstName: user.firstName ?? '', lastName: user.lastName ?? '', phone: user.phone ?? '', email: user.email }
    const batches = await findBookableBatches(payload, product.id, locale)
    batchOptions = batches.map(b => ({
      id: b.id,
      label: b.label,
      status: b.status === 'open' ? 'open' : 'planned',
      remaining: remainingUnits(b),
      deadlineLabel: b.confirmationDeadline ? formatDay(b.confirmationDeadline, locale) : null,
      note: b.note ?? null,
      pickupDays: (b.pickupDays ?? []).map((d, index) => {
        const point = d.pickupPoint && typeof d.pickupPoint === 'object' ? (d.pickupPoint as PickupPoint) : null
        return { index, label: point ? `${formatDay(d.date, locale)} — ${point.name}` : formatDay(d.date, locale) }
      }),
    }))
  }
  const estimatePerPiece = isBatchProduct && product.averageWeight ? Math.round(product.averageWeight * product.price) : null

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
            {estimatePerPiece !== null && product.averageWeight && (
              <p className="mt-1 text-sm text-ink-muted">
                {t('estimatePerPiece', { amount: formatPrice(estimatePerPiece), weight: String(product.averageWeight).replace('.', locale === 'cs' ? ',' : '.') })}
                {product.weightRange && <> · {t('weightRange', { range: product.weightRange })}</>}
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
              {isBatchProduct ? (
                <BatchBookingForm
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    averageWeight: product.averageWeight ?? null,
                    weightRange: product.weightRange ?? null,
                    minimumOrder: product.minimumOrder ?? 1,
                  }}
                  batches={batchOptions}
                  user={viewer}
                  locale={locale}
                />
              ) : availability.available ? (
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  minimumOrder={product.minimumOrder ?? 1}
                />
              ) : (
                <p role="status" className="rounded border border-line bg-ground-sunken p-3 text-sm font-semibold text-ink">
                  {t(availability.reason)}
                </p>
              )}
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
