/**
 * Direct browser → R2 uploads need an R2 CORS entry for the calling origin.
 * We can only enumerate stable origins (localhost, dev, apex), so environments
 * with unpredictable URLs (feature-branch previews) fall back to the
 * server-side path. That path is subject to Vercel's ~4.5 MB request body cap,
 * which is why deployed stable origins keep the direct path — farm photos run
 * 5–12 MB.
 */
export function clientUploadsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.ENABLE_CLIENT_UPLOADS?.trim().toLowerCase()
  return raw === 'true' || raw === '1'
}
