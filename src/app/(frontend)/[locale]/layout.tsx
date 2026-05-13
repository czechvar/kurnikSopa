import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Bricolage_Grotesque, Parkinsans } from 'next/font/google'
import { routing } from '@/lib/i18n/routing'
import { Header } from '@/components/layout/Header'
import { FooterComponent } from '@/components/layout/Footer'

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
      <body className="min-h-screen flex flex-col bg-surface text-text-primary font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <FooterComponent />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
