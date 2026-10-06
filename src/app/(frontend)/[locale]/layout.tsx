import { Suspense } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Bricolage_Grotesque, Parkinsans } from 'next/font/google'
import { routing } from '@/lib/i18n/routing'
import { Header } from '@/components/layout/Header'
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu'
import { FooterComponent } from '@/components/layout/Footer'
import { FooterAuthActions } from '@/components/layout/FooterAuthActions'
import { Toaster } from '@/components/common/Toaster'
import { ToastFromQuery } from '@/components/common/ToastFromQuery'
import {
  CookieConsentHeadScripts,
  CookieConsentBodyNoscript,
} from '@/components/cookies/CookieConsentHeadScripts'
import { CookieConsentClient } from '@/components/cookies/CookieConsentClient'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['800'],
  variable: '--font-bricolage',
  display: 'swap',
})

const parkinsans = Parkinsans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-parkinsans',
  display: 'swap',
})

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'cs' | 'en')) {
    notFound()
  }

  const messages = await getMessages()
  const skipLabel = (await getTranslations({ locale, namespace: 'nav' }))('skipToContent')

  return (
    <html lang={locale} className={`${bricolage.variable} ${parkinsans.variable}`}>
      <head>
        <CookieConsentHeadScripts />
      </head>
      <body className="farm-frontend min-h-screen flex flex-col bg-ground text-ink font-sans antialiased">
        <CookieConsentBodyNoscript />
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-ground"
          >
            {skipLabel}
          </a>
          <Header userMenu={<HeaderUserMenu locale={locale as 'cs' | 'en'} />} />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
          <FooterComponent authActions={<FooterAuthActions />} />
          <Toaster />
          <Suspense fallback={null}>
            <ToastFromQuery />
          </Suspense>
          <CookieConsentClient locale={locale as 'cs' | 'en'} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
