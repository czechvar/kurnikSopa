import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'

export default async function ContactPage() {
  const t = await getTranslations('contact')
  const tCommon = await getTranslations('common')
  const payload = await getPayload()

  const settings = await payload.findGlobal({ slug: 'site-settings' })

  return (
    <div className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-heading text-4xl mb-8">{t('title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact info */}
          <div>
            <h2 className="font-heading text-2xl mb-6">{t('orderInfo')}</h2>
            <div className="space-y-4">
              {settings.owner && (
                <div>
                  <span className="font-medium">{settings.owner}</span>
                </div>
              )}
              {settings.contact?.phone && (
                <div>
                  <span className="text-text-secondary">{tCommon('phone')}:</span>{' '}
                  <a
                    href={`tel:+420${settings.contact.phone}`}
                    className="text-brand-green hover:underline font-medium"
                  >
                    {settings.contact.phone}
                  </a>
                </div>
              )}
              {settings.contact?.whatsapp && (
                <div>
                  <span className="text-text-secondary">WhatsApp:</span>{' '}
                  <a
                    href={`https://wa.me/420${settings.contact.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-green hover:underline font-medium"
                  >
                    {settings.contact.whatsapp}
                  </a>
                </div>
              )}
              {settings.contact?.email && (
                <div>
                  <span className="text-text-secondary">{tCommon('email')}:</span>{' '}
                  <a
                    href={`mailto:${settings.contact.email}`}
                    className="text-brand-green hover:underline font-medium"
                  >
                    {settings.contact.email}
                  </a>
                </div>
              )}
            </div>

            <h2 className="font-heading text-2xl mt-10 mb-4">{tCommon('address')}</h2>
            {settings.address && (
              <div className="text-text-secondary leading-relaxed">
                <p>{settings.address.street}</p>
                <p>{settings.address.city}</p>
                <p>PSČ {settings.address.zip}</p>
              </div>
            )}

            {(settings.social?.facebook || settings.social?.instagram) && (
              <div className="mt-8 flex gap-4">
                {settings.social.facebook && (
                  <a
                    href={settings.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border-2 border-brand-green text-brand-green font-semibold px-5 py-2 rounded-lg hover:bg-brand-green hover:text-white transition-colors text-sm"
                  >
                    Facebook
                  </a>
                )}
                {settings.social.instagram && (
                  <a
                    href={settings.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border-2 border-brand-green text-brand-green font-semibold px-5 py-2 rounded-lg hover:bg-brand-green hover:text-white transition-colors text-sm"
                  >
                    Instagram
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Contact form placeholder */}
          <div>
            <h2 className="font-heading text-2xl mb-6">Napište nám</h2>
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  {t('formName')}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  {t('formEmail')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">
                  {t('formMessage')}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <button
                type="submit"
                className="bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                {t('formSubmit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
