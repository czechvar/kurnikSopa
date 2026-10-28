import type { Payload } from 'payload'

type Locale = 'cs' | 'en'

export type PreviewDecision =
  | { ok: true; redirectTo: string }
  | { ok: false; status: 400 | 401; message: string }

const toLocale = (value: string | null | undefined): Locale => (value === 'en' ? 'en' : 'cs')

/**
 * The link behind the admin's Preview button. The post's own fields are all it
 * carries: who may follow it is decided by `decidePreview`, from the session.
 */
export function postPreviewPath(doc: { slug?: unknown }, locale: string | undefined): string | null {
  const slug = typeof doc.slug === 'string' ? doc.slug : ''
  if (!slug) return null
  return `/api/preview?slug=${encodeURIComponent(slug)}&locale=${toLocale(locale)}`
}

/**
 * Whether these request headers carry an admin or editor session — the only
 * people who may see drafts. The session cookie is the gate rather than a
 * shared secret, because `admin.preview` ends up in the admin's browser bundle.
 */
export async function hasPreviewSession(payload: Payload, headers: Headers): Promise<boolean> {
  const { user } = await payload.auth({ headers })
  return user?.role === 'admin' || user?.role === 'editor'
}

/**
 * Whether a request to `/api/preview` may switch the storefront into draft
 * mode, and where it goes next. Callers must enforce this before enabling
 * draft mode — the Local API the storefront reads with applies no access
 * control of its own.
 */
export async function decidePreview(
  payload: Payload,
  { headers, searchParams }: { headers: Headers; searchParams: URLSearchParams },
): Promise<PreviewDecision> {
  const slug = searchParams.get('slug')
  if (!slug) return { ok: false, status: 400, message: 'Missing slug' }

  if (!(await hasPreviewSession(payload, headers))) {
    return { ok: false, status: 401, message: 'Not authorised to preview' }
  }

  const locale = toLocale(searchParams.get('locale'))
  return { ok: true, redirectTo: `/${locale}/blog/${encodeURIComponent(slug)}` }
}
