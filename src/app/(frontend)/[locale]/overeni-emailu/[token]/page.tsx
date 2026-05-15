import { VerifyEmailClient } from '@/components/auth/VerifyEmailClient'

type Props = {
  params: Promise<{ locale: 'cs' | 'en'; token: string }>
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { token } = await params
  const { email } = await searchParams
  return (
    <div className="max-w-md mx-auto px-6 py-12 text-center">
      <VerifyEmailClient token={token} email={email} />
    </div>
  )
}
