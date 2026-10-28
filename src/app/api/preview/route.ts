import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { getPayload } from '@/lib/payload'
import { decidePreview } from '@/lib/posts/preview'

export const dynamic = 'force-dynamic'

/**
 * The admin's Preview button lands here. An admin or editor session turns on
 * Next draft mode and goes on to the post; anyone else gets a 401 and draft
 * mode stays off.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload()
  const decision = await decidePreview(payload, {
    headers: await headers(),
    searchParams: req.nextUrl.searchParams,
  })
  if (!decision.ok) {
    return new Response(decision.message, { status: decision.status })
  }

  const draft = await draftMode()
  draft.enable()
  redirect(decision.redirectTo)
}
