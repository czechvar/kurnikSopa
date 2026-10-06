import type { ReactElement } from 'react'

/**
 * STAND-IN ARTWORK. These flat glyphs mark where the commissioned
 * illustrations go (brief: spec 2026-10-03 §4). Replacing a drawing means
 * replacing its entry in GLYPHS — nothing else changes. Main shapes use
 * currentColor (set it with a text-* class); accents are marigold.
 */
export type IllustrationName =
  | 'chicken'
  | 'hen'
  | 'eggs'
  | 'rabbit'
  | 'goose'
  | 'vegetables'
  | 'microgreens'
  | 'scene'

const ACCENT = 'fill-accent'
const ACCENT_STROKE = 'stroke-accent'

const GLYPHS: Record<Exclude<IllustrationName, 'scene'>, ReactElement> = {
  hen: (
    <>
      <ellipse cx="30" cy="38" rx="19" ry="14" fill="currentColor" />
      <circle cx="46" cy="24" r="8" fill="currentColor" />
      <path d="M48 15l2-6 3 5 4-3-2 7z" className={ACCENT} />
      <path d="M54 25l6 2-6 3z" className={ACCENT} />
      <path d="M12 34L2 28l10-1-7-6 11 4z" fill="currentColor" />
      <path d="M26 51v9M36 51v9" className={ACCENT_STROKE} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  chicken: (
    <>
      <circle cx="30" cy="40" r="15" fill="currentColor" />
      <circle cx="44" cy="26" r="9" fill="currentColor" />
      <path d="M52 26l7 2-7 3z" className={ACCENT} />
      <path d="M26 54v7M34 54v7" className={ACCENT_STROKE} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  eggs: (
    <>
      <ellipse cx="22" cy="38" rx="11" ry="14" fill="currentColor" />
      <ellipse cx="42" cy="36" rx="11" ry="14" className={ACCENT} />
      <path d="M6 52h52" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  rabbit: (
    <>
      <ellipse cx="30" cy="42" rx="18" ry="13" fill="currentColor" />
      <circle cx="46" cy="30" r="9" fill="currentColor" />
      <ellipse cx="43" cy="13" rx="3.5" ry="11" fill="currentColor" />
      <ellipse cx="51" cy="14" rx="3.5" ry="11" fill="currentColor" transform="rotate(14 51 14)" />
      <circle cx="12" cy="42" r="5" className={ACCENT} />
    </>
  ),
  goose: (
    <>
      <ellipse cx="28" cy="44" rx="20" ry="12" fill="currentColor" />
      <path d="M40 40c2-12 0-22 6-28" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="47" cy="11" r="6" fill="currentColor" />
      <path d="M52 10l8 2-8 3z" className={ACCENT} />
      <path d="M24 55v6M32 55v6" className={ACCENT_STROKE} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  vegetables: (
    <>
      <circle cx="22" cy="24" r="9" className={ACCENT} />
      <circle cx="38" cy="21" r="10" fill="currentColor" />
      <path d="M47 14c4-6 9-6 11-4-1 5-5 8-11 8z" fill="currentColor" />
      <path d="M8 30h48l-5 26H13z" fill="currentColor" />
      <path d="M12 40h40M14 48h36" stroke="#FFFDFB" strokeWidth="2" opacity=".55" />
    </>
  ),
  microgreens: (
    <>
      <path d="M32 58V30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 34C20 34 12 26 12 14c12 0 20 8 20 20z" fill="currentColor" />
      <path d="M32 30c0-10 7-17 18-17 0 10-7 17-18 17z" className={ACCENT} />
      <path d="M14 58h36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
}

function Scene() {
  return (
    <>
      <circle cx="690" cy="52" r="30" className={ACCENT} />
      <path d="M0 110 C150 60 300 70 450 100 S760 120 900 78 V150 H0z" className="fill-panel-sage" />
      <path d="M0 128 C200 96 380 126 560 116 S800 100 900 118 V150 H0z" className="fill-panel-blush" />
      <g fill="currentColor">
        <path d="M196 86h66v32h-66z" />
        <path d="M190 88l39-22 39 22z" />
        <circle cx="208" cy="121" r="5" />
        <circle cx="250" cy="121" r="5" />
      </g>
      <svg x="300" y="92" width="34" height="34" viewBox="0 0 64 64">{GLYPHS.hen}</svg>
      <svg x="352" y="100" width="28" height="28" viewBox="0 0 64 64">{GLYPHS.hen}</svg>
      <svg x="456" y="104" width="26" height="26" viewBox="0 0 64 64">{GLYPHS.rabbit}</svg>
      <svg x="560" y="86" width="40" height="40" viewBox="0 0 64 64">{GLYPHS.goose}</svg>
    </>
  )
}

type Props = {
  name: IllustrationName
  className?: string
}

/** Decorative: the neighbouring text always names the subject. */
export function Illustration({ name, className = '' }: Props) {
  if (name === 'scene') {
    return (
      <svg
        viewBox="0 0 900 150"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        <Scene />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      {GLYPHS[name]}
    </svg>
  )
}
