import { describe, expect, it } from 'vitest'
import { renderQrPng } from '@/lib/payment/qr'

describe('renderQrPng', () => {
  it('returns a Buffer with the PNG magic header', async () => {
    const png = await renderQrPng('SPD*1.0*ACC:CZ00*AM:1.00*CC:CZK*X-VS:1*MSG:x')
    expect(Buffer.isBuffer(png)).toBe(true)
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  })

  it('produces a non-trivial image (>100 bytes) for a real SPAYD string', async () => {
    const png = await renderQrPng('SPD*1.0*ACC:CZ6520100000002901234567*AM:1234.50*CC:CZK*X-VS:202600000001*MSG:Kurnik Sopa 202600000001')
    expect(png.length).toBeGreaterThan(100)
  })
})
