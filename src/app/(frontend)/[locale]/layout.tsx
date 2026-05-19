import { Suspense } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
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

  return (
    <html lang={locale} className={`${bricolage.variable} ${parkinsans.variable}`}>
      <head>
        <CookieConsentHeadScripts />
      </head>
      <body className="farm-frontend min-h-screen flex flex-col bg-surface text-text-primary font-sans antialiased">
        <CookieConsentBodyNoscript />
        <NextIntlClientProvider messages={messages}>
          <Header userMenu={<HeaderUserMenu locale={locale as 'cs' | 'en'} />} />
          <main className="flex-1">{children}</main>
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
