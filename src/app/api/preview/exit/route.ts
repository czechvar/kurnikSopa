import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/** "Leave preview" on the preview banner: draft mode off, back to the blog. */
export async function GET(req: NextRequest): Promise<Response> {
  const locale = req.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'cs'
  const draft = await draftMode()
  draft.disable()
  redirect(`/${locale}/blog`)
}
