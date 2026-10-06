type Props = {
  eyebrow?: string
  title: string
  /** h1 for a page's opening block, h2 for sections below it. */
  as?: 'h1' | 'h2'
  /** Hairline rules above and below the title — the hero treatment. */
  ruled?: boolean
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  as: Tag = 'h2',
  ruled = false,
  align = 'center',
  className = '',
}: Props) {
  const center = align === 'center'
  const rule = <span aria-hidden="true" className={`block h-px bg-ink/30 my-3 ${center ? 'mx-auto w-3/4 max-w-lg' : 'w-24'}`} />
  return (
    <div className={`${center ? 'text-center' : ''} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted">{eyebrow}</p>
      )}
      {ruled && rule}
      <Tag
        className={
          Tag === 'h1'
            ? 'text-4xl md:text-5xl leading-tight text-ink'
            : 'mt-1 text-3xl md:text-4xl leading-tight text-ink'
        }
      >
        {title}
      </Tag>
      {ruled && rule}
    </div>
  )
}
