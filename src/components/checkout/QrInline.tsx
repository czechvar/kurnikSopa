import { renderQrDataUrl } from '@/lib/payment/qr'
import Image from 'next/image'

type Props = { spayd: string; alt: string }

export async function QrInline({ spayd, alt }: Props) {
  const dataUrl = await renderQrDataUrl(spayd)
  // next/image needs explicit dimensions; data URLs work directly
  return <Image src={dataUrl} alt={alt} width={280} height={280} className="border border-gray-200 rounded-lg" unoptimized />
}
