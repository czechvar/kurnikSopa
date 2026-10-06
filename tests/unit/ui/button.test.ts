import { describe, expect, it } from 'vitest'
import { buttonClass } from '@/components/ui/button'

describe('buttonClass', () => {
  it('primary is an ink fill with light text', () => {
    const c = buttonClass('primary')
    expect(c).toContain('bg-ink')
    expect(c).toContain('text-ground')
  })

  it('accent is a marigold fill with deep ink text, never marigold text', () => {
    const c = buttonClass('accent')
    expect(c).toContain('bg-accent')
    expect(c).toContain('text-ink-deep')
    expect(c).not.toContain('text-accent')
  })

  it('outline keeps an ink border so the control is visible on any panel', () => {
    expect(buttonClass('outline')).toContain('border-ink')
  })

  it('appends extra classes', () => {
    expect(buttonClass('primary', 'md', 'w-full')).toMatch(/ w-full$/)
  })
})
