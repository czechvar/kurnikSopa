import createMiddleware from 'next-intl/middleware'
import { routing } from '@/lib/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: [
    // Match all pathnames except for
    // - /api (API routes)
    // - /admin (Payload admin)
    // - /_next (Next.js internals)
    // - /media (uploaded files)
    // - files with extensions (e.g. favicon.ico)
    '/((?!api|admin|_next|media|.*\\..*).*)',
  ],
}
