import type { ReactNode } from 'react'

/** Marigold pill. Text is ink-deep — marigold is never a text colour. */
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-ink-deep ${className}`}
    >
      {children}
    </span>
  )
}
