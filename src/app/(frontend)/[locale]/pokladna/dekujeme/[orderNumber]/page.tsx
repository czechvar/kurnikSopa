import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { redirect } from '@/lib/i18n/routing'
import { ThankYouContent } from '@/components/checkout/ThankYouContent'
import type { SiteSetting } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en'; orderNumber: string }> }

export default async function ThankYouPage({ params }: Props) {
  const { locale, orderNumber } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect({ href: '/prihlaseni', locale })

  const found = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 1,
  })
  const order = found.docs[0]
  if (!order) notFound()

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <ThankYouContent order={order} settings={settings} locale={locale} />
    </div>
  )
}
