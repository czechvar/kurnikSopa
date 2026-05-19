import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'obchodniPodminky' })
  return {
    title: t('pageTitle'),
  }
}

export default async function ObchodniPodminkyPage({ params }: Props) {
  const { locale } = await params

  if (locale === 'en') {
    const tEn = await getTranslations({ locale, namespace: 'obchodniPodminky' })
    return (
      <div className="py-12 px-6">
        <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
          <h1 className="font-heading text-4xl mb-8">{tEn('pageTitle')}</h1>
          <p>{tEn('czechAuthoritativeNotice')}</p>
          <p>
            <a href="/cs/obchodni-podminky" className="underline">
              {tEn('czechLinkLabel')}
            </a>
          </p>
        </div>
      </div>
    )
  }

  const t = await getTranslations({ locale, namespace: 'obchodniPodminky' })

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
        <h1 className="font-heading text-4xl mb-8">{t('pageTitle')}</h1>

        <h2>{t('section1Title')}</h2>
        <p>1.1. {t('section1_1')}</p>
        <p>1.2. {t('section1_2')}</p>
        <p>1.3. {t('section1_3')}</p>

        <blockquote>
          <p>
            <strong>{t('identificationTitle')}</strong>
          </p>
          <ul>
            <li>{t('identificationSeller')}</li>
            <li>{t('identificationAddress')}</li>
            <li>{t('identificationIco')}</li>
            <li>{t('identificationRegistration')}</li>
            <li>{t('identificationEmail')}</li>
            <li>{t('identificationPhone')}</li>
          </ul>
        </blockquote>

        <h2>{t('section2Title')}</h2>
        <p>2.1. {t('section2_1')}</p>
        <p>2.2. {t('section2_2')}</p>
        <p>2.3. {t('section2_3')}</p>

        <h2>{t('section3Title')}</h2>
        <p>3.1. {t('section3_1')}</p>
        <p>3.2. {t('section3_2')}</p>
        <p>3.3. {t('section3_3')}</p>
        <p>3.4. {t('section3_4')}</p>

        <h2>{t('section4Title')}</h2>
        <p>4.1. {t('section4_1Intro')}</p>
        <ul>
          <li>{t('section4_1a')}</li>
          <li>{t('section4_1b')}</li>
          <li>{t('section4_1c')}</li>
          <li>{t('section4_1d')}</li>
        </ul>
        <p>4.2. {t('section4_2')}</p>

        <h2>{t('section5Title')}</h2>
        <p>5.1. {t('section5_1')}</p>
        <p>5.2. {t('section5_2')}</p>
        <p>5.3. {t('section5_3')}</p>
        <p>5.4. {t('section5_4')}</p>
        <p>5.5. {t('section5_5')}</p>

        <h2>{t('section6Title')}</h2>
        <p>6.1. {t('section6_1')}</p>
        <p>6.2. {t('section6_2Intro')}</p>
        <ul>
          <li>{t('section6_2a')}</li>
          <li>{t('section6_2b')}</li>
          <li>{t('section6_2c')}</li>
        </ul>
        <p>6.3. {t('section6_3')}</p>
        <p>6.4. {t('section6_4')}</p>
        <p>6.5. {t('section6_5')}</p>

        <h2>{t('section7Title')}</h2>
        <p>7.1. {t('section7_1')}</p>
        <p>7.2. {t('section7_2')}</p>

        <h2>{t('section8Title')}</h2>
        <p>8.1. {t('section8_1')}</p>
        <p>8.2. {t('section8_2')}</p>
        <p>8.3. {t('section8_3')}</p>
      </div>
    </div>
  )
}
