'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-start gap-3 w-full p-4 rounded-xl shadow-lg font-sans bg-brand-cream text-brand-green-deep border border-brand-green/20',
          title: 'font-semibold text-brand-green-deep',
          description: 'text-brand-green-deep/80 text-sm mt-1',
          icon: 'text-brand-green shrink-0',
          closeButton:
            '!bg-brand-cream !text-brand-green-deep !border-brand-green/20 hover:!bg-brand-cream-dark',
        },
      }}
    />
  )
}
