type Props = {
  eyebrow?: string
  title: string
  lead?: string
}

/** Opening band of every inner page: eyebrow, h1, one-line lead. */
export function PageHeader({ eyebrow, title, lead }: Props) {
  return (
    <header className="bg-ground-sunken px-5 py-12 text-center md:py-16">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-4xl leading-tight text-ink md:text-5xl">{title}</h1>
      {lead && <p className="mx-auto mt-3 max-w-xl text-lg text-ink-muted">{lead}</p>}
    </header>
  )
}
