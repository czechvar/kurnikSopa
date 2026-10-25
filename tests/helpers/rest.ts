import { handleEndpoints } from 'payload'
import { getTestPayload } from './payload'

type RestOptions = {
  body?: unknown
  /** Raw `Cookie` header, e.g. `payload-token=…`. */
  cookie?: string
}

/**
 * Send a request through Payload's real REST handler (the same one Next mounts
 * at /api), so auth strategies, cookies and custom endpoints behave as they do
 * in the browser. Uses the cached test Payload, whose email adapter is the spy.
 */
export async function rest(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, opts: RestOptions = {}): Promise<Response> {
  const payload = await getTestPayload()
  const headers = new Headers()
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json')
  if (opts.cookie) headers.set('Cookie', opts.cookie)
  const request = new Request(`http://localhost:3000${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  return handleEndpoints({ config: payload.config, request })
}

/** Log in over REST and return the `payload-token=…` cookie the browser would keep. */
export async function loginCookie(email: string, password: string): Promise<string> {
  const res = await rest('POST', '/api/users/login', { body: { email, password } })
  if (res.status !== 200) throw new Error(`login for ${email} answered ${res.status}: ${await res.text()}`)
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/payload-token=([^;]+)/)
  if (!match) throw new Error(`login for ${email} set no payload-token cookie`)
  return `payload-token=${match[1]}`
}
