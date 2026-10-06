/**
 * A small in-memory rate limiter for the public account endpoints. Per
 * serverless instance only, so it slows a script down rather than stopping a
 * determined attacker; good enough for a farm's access-request form. A shared
 * store is listed under deferred follow-ups on the board.
 */
const hits = new Map<string, number[]>()

export function allowRequest(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const since = now - windowMs
  const recent = (hits.get(key) ?? []).filter(t => t > since)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (!times.some(t => t > since)) hits.delete(k)
  }
  return true
}

/** Test hook. */
export function resetRateLimits(): void {
  hits.clear()
}

export function clientKey(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
