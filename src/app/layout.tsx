import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kurník & Šopa — Regenerativní farma',
  description:
    'Malá regenerativní farma v Křepicích u Hustopečí. Pasená kuřata, vejce, husy, králíci a zelenina.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
