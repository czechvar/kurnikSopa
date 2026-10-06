'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { NavLinks, type NavItem } from './NavLinks'
import { Logo } from './Logo'
import { buttonClass } from '@/components/ui/button'

type Props = {
  items: NavItem[]
  openLabel: string
  closeLabel: string
  /** Locale switch and login/account link, rendered by the server header. */
  footer?: ReactNode
  phone?: { href: string; label: string }
}

/**
 * Phone navigation. Native <dialog> supplies the focus trap, Esc to close and
 * focus return to the trigger, so none of that is hand-rolled.
 */
export function MobileNav({ items, openLabel, closeLabel, footer, phone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const id = useId()

  const show = () => {
    dialog.current?.showModal()
    setOpen(true)
  }
  const close = () => dialog.current?.close()

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex h-10 w-10 items-center justify-center rounded text-ink md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        id={id}
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-ground p-0 text-ink backdrop:bg-ink-deep/40"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <Logo className="h-9 w-auto text-ink" title="" />
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="px-5 pt-2">
          <NavLinks items={items} variant="sheet" onNavigate={close} />
          <div className="flex items-center justify-between py-5" onClick={close}>
            {footer}
          </div>
          {phone && (
            <a href={phone.href} className={buttonClass('primary', 'lg', 'w-full')}>
              {phone.label}
            </a>
          )}
        </nav>
      </dialog>
    </>
  )
}
