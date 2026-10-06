import { describe, expect, it } from 'vitest'
import { telHref, whatsappHref } from '@/lib/contact'

describe('contact links', () => {
  it.each(['774801667', '774 801 667', '+420 774 801 667', '420774801667'])(
    'normalises %s',
    (input) => {
      expect(telHref(input)).toBe('tel:+420774801667')
      expect(whatsappHref(input)).toBe('https://wa.me/420774801667')
    },
  )
})
