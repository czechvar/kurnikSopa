import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cookies' })
  return {
    title: t('pageTitle'),
  }
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cookies' })

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
        <h1 className="font-heading text-4xl mb-8">{t('pageTitle')}</h1>

        <p>{t('intro')}</p>

        <h2>{t('section1Title')}</h2>
        <p>{t('section1Body')}</p>

        <h2>{t('section2Title')}</h2>
        <p>{t('section2Intro')}</p>

        <h3>{t('section2DurationTitle')}</h3>
        <ul>
          <li>{t('section2DurationSession')}</li>
          <li>{t('section2DurationPersistent')}</li>
        </ul>

        <h3>{t('section2PurposeTitle')}</h3>
        <table>
          <thead>
            <tr>
              <th>{t('section2PurposeTitle').replace(':', '')}</th>
              <th>{t('section2NecessaryConsent').split(' ')[0]}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{t('section2NecessaryName')}</strong>
                <br />
                {t('section2NecessaryDesc')}
              </td>
              <td>{t('section2NecessaryConsent')}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('section2AnalyticsName')}</strong>
                <br />
                {t('section2AnalyticsDesc')}
              </td>
              <td>{t('section2AnalyticsConsent')}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('section2MarketingName')}</strong>
                <br />
                {t('section2MarketingDesc')}
              </td>
              <td>{t('section2MarketingConsent')}</td>
            </tr>
          </tbody>
        </table>

        <h2>{t('section3Title')}</h2>
        <p>{t('section3Intro')}</p>
        <ul>
          <li>{t('section3Tool1')}</li>
          <li>{t('section3Tool2')}</li>
          <li>{t('section3Tool3')}</li>
          <li>
            <em>{t('section3ToolMore')}</em>
          </li>
        </ul>

        <h2>{t('section4Title')}</h2>
        <h3>{t('section4ASubtitle')}</h3>
        <p>{t('section4ABody')}</p>
        <h3>{t('section4BSubtitle')}</h3>
        <p>{t('section4BBody')}</p>
        <p>
          <strong>{t('section4Warning')}</strong>
        </p>

        <h2>{t('section5Title')}</h2>
        <p>{t('section5Body')}</p>

        <p className="mt-12 text-sm text-text-secondary">
          <em>{t('validFrom')}</em>
        </p>
      </div>
    </div>
  )
}
