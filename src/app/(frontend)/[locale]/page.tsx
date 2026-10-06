import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'
import { publishedPostsWhere } from '@/lib/posts/queries'
import { buttonClass } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { DateBlock } from '@/components/ui/DateBlock'
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration'
import { ProductCard } from '@/components/products/ProductCard'
import { PostCard } from '@/components/blog/PostCard'

// Scheduled posts and the next event change over time; re-render every 5 min.
export const revalidate = 300

const FARM_CARDS: Array<{ key: string; illustration: IllustrationName }> = [
  { key: 'chickens', illustration: 'chicken' },
  { key: 'rabbits', illustration: 'rabbit' },
  { key: 'hens', illustration: 'hen' },
  { key: 'geese', illustration: 'goose' },
  { key: 'vegetables', illustration: 'vegetables' },
  { key: 'microgreens', illustration: 'microgreens' },
]

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('home')
  const tNav = await getTranslations('nav')
  const payload = await getPayload()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [featured, posts, events] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { and: [{ featured: { equals: true } }, { status: { equals: 'published' } }] },
      limit: 3,
      depth: 1,
      locale,
    }),
    payload.find({
      collection: 'posts',
      where: publishedPostsWhere(),
      sort: '-publishedAt',
      limit: 3,
      depth: 1,
      locale,
    }),
    payload.find({
      collection: 'events',
      where: {
        and: [
          { status: { in: ['upcoming', 'full'] } },
          { date: { greater_than_equal: startOfToday.toISOString() } },
        ],
      },
      sort: 'date',
      limit: 1,
      depth: 0,
      locale,
    }),
  ])
  const nextEvent = events.docs[0] ?? null
  const spotsLeft =
    nextEvent?.capacity && nextEvent.registeredCount != null
      ? nextEvent.capacity - nextEvent.registeredCount
      : null

  return (
    <>
      {/* 1 · Hero */}
      <section className="px-5 pt-12 text-center md:pt-16">
        <SectionHeading as="h1" eyebrow={t('hero.eyebrow')} title={t('hero.title')} ruled />
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">{t('hero.subtitle')}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/produkty" className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
            {t('hero.cta')}
          </Link>
          <Link href="/akce" className={buttonClass('outline', 'lg', 'w-full sm:w-auto')}>
            {t('hero.eventsCta')}
          </Link>
        </div>
        <Illustration name="scene" className="mx-auto mt-10 block h-32 w-full max-w-6xl text-ink md:h-44" />
      </section>

      {/* 2 · Three panels — on phones the marigold panel comes first */}
      <section className="grid grid-cols-2 md:grid-cols-[1fr_1.15fr_1fr]">
        <div className="order-2 flex items-center justify-center bg-panel-blush p-6 md:order-1 md:p-10">
          <Illustration name="hen" className="h-24 w-24 text-ink md:h-32 md:w-32" />
        </div>
        <div className="order-1 col-span-2 flex flex-col items-center justify-center gap-3 bg-accent px-6 py-10 text-center text-ink-deep md:order-2 md:col-span-1">
          <h2 className="text-3xl text-ink-deep">{t('panel.title')}</h2>
          <p className="max-w-xs">{t('panel.body')}</p>
          <Link
            href="/produkty"
            className="mt-1 inline-flex items-center rounded border-2 border-ink-deep bg-ink-deep px-5 py-2.5 font-semibold text-ground hover:bg-ink"
          >
            {t('panel.cta')}
          </Link>
        </div>
        <div className="order-3 flex items-center justify-center bg-panel-sage p-6 md:p-10">
          <Illustration name="vegetables" className="h-24 w-24 text-ink md:h-32 md:w-32" />
        </div>
      </section>

      {/* 3 · What we raise */}
      <section className="bg-ground-sunken px-5 py-14 md:py-20">
        <SectionHeading eyebrow={t('farmSection.eyebrow')} title={t('farmSection.title')} />
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FARM_CARDS.map(({ key, illustration }) => (
            <article key={key}>
              <Illustration name={illustration} className="mb-3 h-14 w-14 text-ink" />
              <h3 className="mb-2 text-xl text-ink">{t(`farm.${key}.title`)}</h3>
              <p className="leading-relaxed text-ink-muted">{t(`farm.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 4 · Featured products — omitted when none are flagged */}
      {featured.docs.length > 0 && (
        <section className="px-5 py-14 md:py-20">
          <SectionHeading eyebrow={t('featured.subtitle')} title={t('featured.title')} />
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.docs.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/produkty" className={buttonClass('outline')}>
              {t('featured.all')}
            </Link>
          </div>
        </section>
      )}

      {/* 5 · News — omitted when nothing is published and due */}
      {posts.docs.length > 0 && (
        <section className="bg-ground-sunken px-5 py-14 md:py-20">
          <SectionHeading eyebrow={t('news.eyebrow')} title={t('news.title')} />
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.docs.map((post, i) => (
              <PostCard key={post.id} post={post} locale={locale} index={i} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/blog" className={buttonClass('outline')}>
              {t('news.all')}
            </Link>
          </div>
        </section>
      )}

      {/* 6 · Next event + about */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col gap-4 bg-panel-sage px-6 py-10 md:px-12 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted">{t('events.eyebrow')}</p>
          {nextEvent ? (
            <div className="flex items-center gap-4">
              <DateBlock date={nextEvent.date} locale={locale} />
              <div>
                <h2 className="text-2xl leading-tight text-ink">{nextEvent.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {[
                    nextEvent.startTime,
                    nextEvent.location,
                    nextEvent.status === 'full'
                      ? t('events.full')
                      : spotsLeft !== null
                        ? t('events.spotsLeft', { count: spotsLeft })
                        : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl leading-tight text-ink">{t('events.title')}</h2>
              <p className="mt-1 text-ink-muted">{t('events.subtitle')}</p>
            </div>
          )}
          <Link
            href="/akce"
            className="self-start font-bold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-ink-deep"
          >
            {t('events.all')}
          </Link>
        </div>
        <div className="flex flex-col gap-4 bg-panel-blush px-6 py-10 md:px-12 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted">{t('about.eyebrow')}</p>
          <h2 className="text-2xl leading-tight text-ink">{t('about.title')}</h2>
          <p className="leading-relaxed text-ink">{t('about.description')}</p>
          <Link
            href="/o-nas"
            className="self-start font-bold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-ink-deep"
          >
            {tNav('about')}
          </Link>
        </div>
      </section>
    </>
  )
}
