import QRCode from 'qrcode'

export async function renderQrPng(spayd: string): Promise<Buffer> {
  return QRCode.toBuffer(spayd, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#1f2937',
      light: '#ffffff',
    },
  })
}

export async function renderQrDataUrl(spayd: string): Promise<string> {
  return QRCode.toDataURL(spayd, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#1f2937', light: '#ffffff' },
  })
}
