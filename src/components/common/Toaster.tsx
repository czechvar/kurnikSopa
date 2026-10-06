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
            'flex items-start gap-3 w-full p-4 rounded shadow-lg font-sans bg-ground text-ink-deep border border-line',
          title: 'font-semibold text-ink-deep',
          description: 'text-ink-muted text-sm mt-1',
          icon: 'text-ink shrink-0',
          closeButton:
            '!bg-ground !text-ink-deep !border-line hover:!bg-ground-sunken',
        },
      }}
    />
  )
}
