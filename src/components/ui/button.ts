export type ButtonVariant = 'primary' | 'accent' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded font-semibold border-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink border-ink text-ground hover:bg-ink-deep hover:border-ink-deep',
  // Marigold is a fill only — text on it is always ink-deep (9.7:1).
  accent: 'bg-accent border-accent text-ink-deep hover:bg-accent-strong hover:border-accent-strong',
  outline: 'bg-transparent border-ink text-ink hover:bg-ground-sunken',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-7 py-3.5 text-lg',
}

/**
 * Class string for a button-looking element. A function rather than a
 * component so <button>, <a> and next-intl's <Link> all use it unchanged.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(' ')
}
