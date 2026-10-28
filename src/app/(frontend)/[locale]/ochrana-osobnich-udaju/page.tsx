import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import { sellerIdentity } from '@/lib/legal/seller'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ochranaOsobnichUdaju' })
  return {
    title: t('pageTitle'),
  }
}

export default async function OchranaOsobnichUdajuPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ochranaOsobnichUdaju' })

  if (locale === 'en') {
    return (
      <div className="py-12 px-6">
        <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
          <h1 className="font-heading text-4xl mb-8">{t('pageTitle')}</h1>
          <p>{t('czechAuthoritativeNotice')}</p>
          <p>
            <a href="/cs/ochrana-osobnich-udaju" className="underline">
              {t('czechLinkLabel')}
            </a>
          </p>

          <h2>{t('summaryTitle')}</h2>
          <p>{t('summaryController')}</p>
          <p>{t('summaryData')}</p>
          <p>{t('summaryPurpose')}</p>
          <p>{t('summaryProcessors')}</p>
          <p>{t('summaryRights')}</p>
        </div>
      </div>
    )
  }

  // The controller's identity comes from Site Settings so the farm edits it in
  // the admin rather than in code (same source the footer uses). Anything not
  // filled in yet shows a visible marker.
  const tLegal = await getTranslations({ locale, namespace: 'legal' })
  const seller = sellerIdentity(await getSiteSettings(), locale)
  const or = (v: string | null) => v ?? tLegal('missing')

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
        <h1 className="font-heading text-4xl mb-8">{t('pageTitle')}</h1>

        <p>{t('intro')}</p>

        <h2>{t('section1Title')}</h2>
        <p>{t('section1Intro')}</p>
        <blockquote>
          <ul>
            <li>{t('identificationName', { name: or(seller.name) })}</li>
            <li>{t('identificationAddress', { address: or(seller.address) })}</li>
            <li>{t('identificationIco', { ico: or(seller.ico) })}</li>
            <li>{t('identificationEmail', { email: or(seller.email) })}</li>
            <li>{t('identificationPhone', { phone: or(seller.phone) })}</li>
          </ul>
        </blockquote>
        <p>{t('section1Contact')}</p>

        <h2>{t('section2Title')}</h2>
        <p>{t('section2Intro')}</p>

        <h3>{t('section2_1Title')}</h3>
        <p>{t('section2_1Body')}</p>
        <p>{t('section2_1Basis')}</p>
        <p>{t('section2_1Retention')}</p>

        <h3>{t('section2_2Title')}</h3>
        <p>{t('section2_2Body')}</p>
        <p>{t('section2_2Basis')}</p>
        <p>{t('section2_2Retention')}</p>

        <h3>{t('section2_3Title')}</h3>
        <p>{t('section2_3Body')}</p>
        <p>{t('section2_3Basis')}</p>
        <p>{t('section2_3Retention')}</p>

        <h3>{t('section2_4Title')}</h3>
        <p>{t('section2_4Body')}</p>
        <p>{t('section2_4Basis')}</p>

        <h3>{t('section2_5Title')}</h3>
        <p>
          {t('section2_5Body')}{' '}
          <a href="/cs/cookies" className="underline">
            {t('section2_5Link')}
          </a>
          .
        </p>
        <p>{t('section2_5Basis')}</p>

        <h3>{t('section2_6Title')}</h3>
        <p>{t('section2_6Body')}</p>
        <p>{t('section2_6Basis')}</p>
        <p>{t('section2_6Retention')}</p>

        <h2>{t('section3Title')}</h2>
        <p>{t('section3Intro')}</p>
        <ul>
          <li>{t('section3Vercel')}</li>
          <li>{t('section3Neon')}</li>
          <li>{t('section3Resend')}</li>
          <li>{t('section3Cloudflare')}</li>
          <li>{t('section3Google')}</li>
        </ul>
        <p>{t('section3Transfer')}</p>
        <p>{t('section3Authorities')}</p>
        <p>{t('section3NoSale')}</p>

        <h2>{t('section4Title')}</h2>
        <p>{t('section4Body')}</p>

        <h2>{t('section5Title')}</h2>
        <p>{t('section5Intro')}</p>
        <ul>
          <li>{t('section5a')}</li>
          <li>{t('section5b')}</li>
          <li>{t('section5c')}</li>
          <li>{t('section5d')}</li>
          <li>{t('section5e')}</li>
          <li>{t('section5f')}</li>
          <li>{t('section5g')}</li>
        </ul>
        <p>{t('section5How')}</p>
        <p>{t('section5Complaint')}</p>

        <h2>{t('section6Title')}</h2>
        <p>{t('section6Body')}</p>

        <h2>{t('section7Title')}</h2>
        <p>{t('section7Body')}</p>
        <p>{t('validFrom', { date: or(seller.effectiveFrom) })}</p>
      </div>
    </div>
  )
}
