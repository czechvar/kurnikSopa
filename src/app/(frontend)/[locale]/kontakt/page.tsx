import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { formatPhone } from '@/lib/utils'
import { telHref, whatsappHref } from '@/lib/contact'
import { PageHeader } from '@/components/ui/PageHeader'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

function Action({ href, label, value, external }: { href: string; label: string; value: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center justify-between gap-4 rounded-md border-2 border-ink px-5 py-4 text-ink transition-colors hover:bg-ground-sunken"
    >
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</span>
        <span className="mt-0.5 block font-heading text-xl font-extrabold">{value}</span>
      </span>
      <span aria-hidden="true" className="text-2xl">&rarr;</span>
    </a>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-ink-deep">{children}</dd>
    </div>
  )
}

/**
 * Three channels that actually reach the farm. The old page had a message
 * form with no submit handler — anything typed into it was lost — so it is
 * gone until a real one is built.
 */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('contact')
  const tCommon = await getTranslations('common')
  const tEvents = await getTranslations('events')
  const payload = await getPayload()
  const settings = await payload.findGlobal({ slug: 'site-settings', locale })

  const phone = settings.contact?.phone
  const whatsapp = settings.contact?.whatsapp
  const email = settings.contact?.email
  const address = settings.address

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <div className="px-5 py-10 md:py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col gap-4">
            {phone && <Action href={telHref(phone)} label={t('call')} value={formatPhone(phone)} />}
            {whatsapp && (
              <Action href={whatsappHref(whatsapp)} label={tEvents('whatsapp')} value={formatPhone(whatsapp)} external />
            )}
            {email && <Action href={`mailto:${email}`} label={t('write')} value={email} />}
          </div>

          <dl className="space-y-5 self-start rounded-md bg-panel-sage p-6 md:p-8">
            {settings.owner && <Row label={t('owner')}>{settings.owner}</Row>}
            {address && (
              <Row label={tCommon('address')}>
                {address.street && <>{address.street}<br /></>}
                {address.zip} {address.city}
              </Row>
            )}
            {settings.openingHours && (
              <Row label={t('hours')}>
                <span className="whitespace-pre-line">{settings.openingHours}</span>
              </Row>
            )}
            {(settings.social?.facebook || settings.social?.instagram) && (
              <Row label={t('social')}>
                <span className="flex gap-4">
                  {settings.social?.facebook && (
                    <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                      Facebook
                    </a>
                  )}
                  {settings.social?.instagram && (
                    <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                      Instagram
                    </a>
                  )}
                </span>
              </Row>
            )}
          </dl>
        </div>
      </div>
    </>
  )
}
