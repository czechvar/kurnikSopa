import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { ThankYouContent } from '@/components/checkout/ThankYouContent'
import { BookingPanel } from '@/components/orders/BookingPanel'
import { findOrderForViewer } from '@/lib/orders/findOrderForViewer'
import type { SiteSetting } from '@/payload-types'

type Props = {
  params: Promise<{ locale: 'cs' | 'en'; orderNumber: string }>
  searchParams: Promise<{ t?: string | string[] }>
}

/**
 * The order page after checkout, and the page the confirmation email links
 * to. Order numbers are sequential, so the page only opens for the order's
 * owner, for staff, or with the access token from the email (`?t=`).
 */
export default async function ThankYouPage({ params, searchParams }: Props) {
  const { locale, orderNumber } = await params
  const { t } = await searchParams
  const token = typeof t === 'string' ? t : null

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  const order = await findOrderForViewer(payload, { orderNumber, user: user ?? null, token })
  if (!order) notFound()

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const isGuest = !order.customer

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ThankYouContent order={order} settings={settings} locale={locale} isGuest={isGuest} isBooking={Boolean(order.batch)}>
        <BookingPanel payload={payload} order={order} settings={settings} locale={locale} token={token} />
      </ThankYouContent>
    </div>
  )
}
