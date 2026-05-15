# Toast Notifications

**Date:** 2026-05-15
**Status:** Approved (design)
**Scope of this spec:** Introduce a site-wide toast notification system with farm-flavored copy, replace the existing `/prihlaseni` inline success banners with toasts, and ship the long-missing `/kosik` page as the first new caller (redirects unauthenticated visitors to register with an explanatory toast).

**Explicitly out of scope:**
- Migrating the `/ucet` section success banners ("Údaje uloženy", "Adresy uloženy", "Heslo změněno") — they're tightly coupled to the form that produced them and inline feedback is the better UX. Can migrate later if we change our minds.
- Migrating the signup "Check your inbox" full-page state — toasts are wrong for instructions the user must act on.
- The actual cart implementation (Phase 3c). The page in this PR is a redirect-or-placeholder, nothing more.
- Real-time / persistent notifications, in-app inbox, push notifications. Out of scope; toast = ephemeral only.

## 1. Goals & non-goals

**Goals**
- Drop-in toast capability usable from any client component with one import.
- Server Components can also trigger toasts via a `redirect()` with a typed query-param helper.
- Bilingual copy via `next-intl`. Each toast has a brand-aligned witty title and a clear, actionable body.
- Fix the orphan `/kosik` route — clicking the cart button no longer 404s.
- Provide defense-in-depth against future orphan routes in the locale group.

**Non-goals**
- Custom-built toast component — we're using `sonner` (~5KB), not reinventing.
- Persistent notification history. Toasts auto-dismiss; no inbox.
- Server Actions integration beyond the redirect-with-query-param pattern. (We may add a `cookies()`-based flash-message system in a future PR if Server Actions become a common toast source — out of scope here.)
- Custom toast animations or theming beyond brand-color overrides.

## 2. Architecture overview

```
                            ┌─────────────────────────────┐
Server Component            │  redirect(buildToastUrl(    │
(e.g. /kosik/page.tsx)──────┤    '/registrace',           │
                            │    'loginRequiredCart',     │
                            │    'info',                  │
                            │  ))                         │
                            └─────────────────────────────┘
                                          │
                                          ▼  /cs/registrace?toast=loginRequiredCart&type=info
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │                                               │
                  ▼                                               ▼
Client Component                              <ToastFromQuery/> (mounted in layout)
(e.g. SignupForm.tsx)                         reads useSearchParams() → toast.info(
import { toast } from 'sonner'                  t('toasts.loginRequiredCart.title'),
toast.success(...)                              { description: t('toasts.loginRequiredCart.body') }
                                              ) → router.replace to strip the params
                  │                                               │
                  └───────────────────┬───────────────────────────┘
                                      ▼
                              <Toaster/> (sonner)
                              mounted once in
                              (frontend)/[locale]/layout.tsx
```

Two trigger paths into one renderer. The `<Toaster/>` is the only sonner-aware UI; everything else just calls `toast.*()`.

## 3. Files

**Created:**
```
src/components/common/Toaster.tsx          — thin wrapper around sonner's <Toaster/> with brand styling
src/components/common/ToastFromQuery.tsx   — client component; reads ?toast=&type= and fires
src/lib/toast-keys.ts                      — typed string-union of allowed keys + buildToastUrl helper
src/app/(frontend)/[locale]/kosik/page.tsx — Server Component; unauth → redirect with toast; auth → placeholder
src/app/(frontend)/[locale]/not-found.tsx  — defense-in-depth for orphan routes inside the locale group
```

**Modified:**
```
src/app/(frontend)/[locale]/layout.tsx     — mount <Toaster/> and <ToastFromQuery/>
src/app/(frontend)/[locale]/prihlaseni/page.tsx — drop the inline banner block
src/components/auth/VerifyEmailClient.tsx  — redirect target switches to ?toast=emailVerified&type=success
src/components/auth/ResetPasswordForm.tsx  — redirect target switches to ?toast=passwordReset&type=success
messages/cs.json                           — add toasts.* namespace
messages/en.json                           — add toasts.* namespace
package.json                               — npm install sonner
```

## 4. Toast keys (v1)

Three keys for this PR. The key in `toast-keys.ts`'s string-union must exactly match the key under `toasts.*` in both message files.

```ts
// src/lib/toast-keys.ts
export type ToastKey = 'loginRequiredCart' | 'emailVerified' | 'passwordReset'
export type ToastType = 'success' | 'info' | 'error'

const TOAST_TYPES: readonly ToastType[] = ['success', 'info', 'error'] as const
const TOAST_KEYS: readonly ToastKey[] = ['loginRequiredCart', 'emailVerified', 'passwordReset'] as const

export function isToastKey(v: unknown): v is ToastKey {
  return typeof v === 'string' && (TOAST_KEYS as readonly string[]).includes(v)
}
export function isToastType(v: unknown): v is ToastType {
  return typeof v === 'string' && (TOAST_TYPES as readonly string[]).includes(v)
}

/**
 * Build a query object for a toast-bearing redirect. Pair with next-intl's
 * `redirect({ href: { pathname, query: toastQuery(...) }, locale })`.
 */
export function toastQuery(key: ToastKey, type: ToastType): { toast: ToastKey; type: ToastType } {
  return { toast: key, type }
}

/**
 * String-form builder for client-side `router.push(...)` where we already
 * have a localized pathname.
 */
export function buildToastUrl(href: string, key: ToastKey, type: ToastType): string {
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}toast=${encodeURIComponent(key)}&type=${encodeURIComponent(type)}`
}
```

Adding a future key is: union member + entry in both JSON files + (optionally) a new caller. Three coordinated edits, all caught by the type system if any caller drifts.

## 5. Copy

`messages/cs.json` under `toasts.*`:

```json
{
  "loginRequiredCart": {
    "title": "Tady na farmě se nepouští každý do kurníku.",
    "body": "Zaregistruj se a objednej si produkty."
  },
  "emailVerified": {
    "title": "Vajíčko snesené, e-mail ověřený.",
    "body": "Můžeš se přihlásit."
  },
  "passwordReset": {
    "title": "Husy ti dávají zelenou.",
    "body": "Přihlas se s novým heslem."
  }
}
```

`messages/en.json`:

```json
{
  "loginRequiredCart": {
    "title": "The henhouse is for members only.",
    "body": "Sign up to order products."
  },
  "emailVerified": {
    "title": "Egg laid, email verified.",
    "body": "You can now log in."
  },
  "passwordReset": {
    "title": "The geese give you the green light.",
    "body": "Log in with your new password."
  }
}
```

Voice rule for future keys: a short witty opener (one phrase) that references the farm/animals/produce already on the homepage, followed by a clear actionable body. Skip the wit for very high-frequency confirmations (e.g. "saved") where it would get noisy — those use just the body line.

## 6. The Toaster

`src/components/common/Toaster.tsx`:

```tsx
'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'font-sans',
        },
      }}
    />
  )
}
```

`richColors` gives us sonner's typed background/border (green for success, red for error, blue for info, etc.) so we don't have to roll our own. We can replace these with brand colors in a follow-up if needed; for v1 the defaults are good enough and they read clearly on either light or dark backgrounds.

Mounted in `(frontend)/[locale]/layout.tsx` once. The Payload admin (`/admin`) doesn't get the toaster — it has its own UI conventions and we don't drive toasts there.

## 7. `<ToastFromQuery/>`

`src/components/common/ToastFromQuery.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { isToastKey, isToastType } from '@/lib/toast-keys'

export function ToastFromQuery() {
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('toasts')

  useEffect(() => {
    const key = search.get('toast')
    const type = search.get('type')
    if (!isToastKey(key) || !isToastType(type)) return

    const title = t(`${key}.title`)
    const body = t(`${key}.body`)
    toast[type](title, { description: body })

    // Strip the params so back-nav / refresh doesn't refire.
    const next = new URLSearchParams(search.toString())
    next.delete('toast')
    next.delete('type')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, router, pathname, t])

  return null
}
```

Implementation notes:
- Uses Next's own `useSearchParams` / `useRouter` from `'next/navigation'` (not next-intl's) because we only need to strip query params, not change locale.
- Wrapped in `<Suspense/>` at the mount site — `useSearchParams` requires a Suspense boundary in Next 15 production builds.
- `router.replace` with `scroll: false` prevents the page jumping when params strip.
- Strict key + type validation means an attacker can't smuggle an arbitrary value into `toast[type]` or `t(...)` — both are bounded by the typed predicates.

## 8. Layout integration

`src/app/(frontend)/[locale]/layout.tsx`:

```tsx
import { Suspense } from 'react'
import { Toaster } from '@/components/common/Toaster'
import { ToastFromQuery } from '@/components/common/ToastFromQuery'

// ...inside the JSX, replace the existing body content:
<body className="farm-frontend min-h-screen flex flex-col bg-surface text-text-primary font-sans antialiased">
  <NextIntlClientProvider messages={messages}>
    <Header userMenu={<HeaderUserMenu />} />
    <main className="flex-1">{children}</main>
    <FooterComponent authActions={<FooterAuthActions />} />
    <Toaster />
    <Suspense fallback={null}>
      <ToastFromQuery />
    </Suspense>
  </NextIntlClientProvider>
</body>
```

Both new components sit outside `<main/>` so they don't shift content layout.

## 9. `/kosik/page.tsx`

```tsx
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { toastQuery } from '@/lib/toast-keys'
import { getTranslations } from 'next-intl/server'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CartPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect({
      href: {
        pathname: '/registrace',
        query: toastQuery('loginRequiredCart', 'info'),
      },
      locale,
    })
  }

  // Logged-in placeholder until Phase 3c builds the real cart.
  const t = await getTranslations({ locale, namespace: 'cart' })
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <p className="text-text-secondary">{t('comingSoon')}</p>
    </div>
  )
}
```

The `redirect({ href: { pathname, query }, locale })` object form preserves type safety: `/registrace` is a known pathname in `routing.ts`, and query params are passed separately rather than being baked into the href string. Next-intl resolves the locale-specific slug (e.g. `/en/register?toast=…&type=…`) on output.

Two new i18n keys (`cart.title`, `cart.comingSoon`). Both CZ + EN. Suggested copy:

- CZ: title `Košík`, body `Košík zatím připravujeme. Vracíme se s ním brzy.`
- EN: title `Cart`, body `We're still building the cart. Coming soon.`

Confirmed working state when this PR ships: clicking Košík from any page either lands you on the placeholder (logged in) or triggers a redirect + toast on `/registrace` (logged out).

## 10. `<not-found.tsx>`

`src/app/(frontend)/[locale]/not-found.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-5xl md:text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">{t('body')}</p>
      <Link
        href="/"
        className="inline-block bg-brand-cream text-brand-green-deep font-semibold px-6 py-3 rounded-lg hover:bg-brand-cream-dark transition-colors"
      >
        {t('home')}
      </Link>
    </div>
  )
}
```

Two new i18n keys (`notFound.body`, `notFound.home`).

- CZ: body `Tady kuřata nebydlí. Stránka, kterou hledáš, neexistuje.`, home `Zpět na úvod`
- EN: body `No chickens live here. The page you're looking for doesn't exist.`, home `Back to home`

This file sits inside the `[locale]` segment, so when Next can't find a page within the locale group, it renders this — wrapped by `[locale]/layout.tsx` which provides `<html>`/`<body>`. The current global not-found crash is avoided.

## 11. Migration of existing banners

**`src/app/(frontend)/[locale]/prihlaseni/page.tsx`** — drop the banner block:

```diff
-  let banner: string | null = null
-  if (status === 'verified') banner = t('banners.verified')
-  if (status === 'reset-ok') banner = t('banners.resetOk')
-
   return (
     <div className="max-w-md mx-auto px-6 py-12">
       <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
-      {banner && (
-        <div role="status" className="mb-6 rounded-lg bg-green-50 text-green-800 px-4 py-3">
-          {banner}
-        </div>
-      )}
       <LoginForm />
     </div>
   )
```

The `auth.login.banners.*` i18n keys can be left in messages.json for now (they're tiny and don't hurt). Optional follow-up: delete them.

**`src/components/auth/VerifyEmailClient.tsx`** — redirect target:

```diff
-          router.replace('/prihlaseni?status=verified')
+          router.replace('/prihlaseni?toast=emailVerified&type=success')
```

**`src/components/auth/ResetPasswordForm.tsx`** — redirect target:

```diff
-      router.push('/prihlaseni?status=reset-ok')
+      router.push('/prihlaseni?toast=passwordReset&type=success')
```

Net effect after migration: `/prihlaseni` no longer reads `status` at all. Inline green banner replaced by sonner toast that auto-dismisses.

## 12. Authorization / safety

- The toast key and type are read from URL params with strict typed predicates (`isToastKey`, `isToastType`). Anything that doesn't match falls through silently — no `t(unknownKey)` runtime error, no `toast[unknownType](...)` call.
- `<ToastFromQuery/>` strips the params after firing once, so refreshing the page or hitting back doesn't refire stale toasts.
- Copy can't be injected via URL — only the key is in the URL; the actual strings come from `messages/*.json` which are server-controlled.

## 13. Verification plan

Manual against a local dev server:

1. **Cart redirect (logged out):**
   - Sign out if needed.
   - Click Košík in the header from any page.
   - Expected: lands on `/cs/registrace` with the URL `…/registrace?toast=loginRequiredCart&type=info` for a split second, then the params are stripped (`router.replace`), and a blue/info toast pops in the bottom-right with the henhouse copy.
   - Try at `/en/cart` too — expect `…/register?toast=…` and the EN copy.
2. **Cart placeholder (logged in):**
   - Log in.
   - Click Košík → `/cs/kosik` renders the "Cart coming soon" placeholder. No toast fires.
3. **Email verification toast:**
   - Sign up a fresh test user, click the verify link in the dev terminal email log.
   - Expected: lands on `/cs/prihlaseni`, query params strip, green/success toast with "Vajíčko snesené, e-mail ověřený."
4. **Password reset toast:**
   - Trigger forgot-password, click the reset link, set a new password.
   - Expected: lands on `/cs/prihlaseni`, toast "Husy ti dávají zelenou."
5. **Toast does not refire:**
   - After a toast fires, hit browser back, then forward. Toast should not appear a second time.
6. **404 page:**
   - Visit `/cs/this-route-does-not-exist`.
   - Expected: the new 404 page renders with the layout header/footer intact (no "Missing html/body" runtime error).
7. **Accessibility:**
   - Each toast has the expected ARIA role (sonner gives `role="status"` for success/info, `role="alert"` for error).
   - Toasts are keyboard-dismissable via the close button.
8. **Mobile viewport:**
   - iPhone-sized viewport: toast position adapts (sonner handles this); no horizontal overflow.

Automated:

- `npx tsc --noEmit` — 0 errors. The typed predicates catch mismatches between `ToastKey` union and JSON keys *only at usage sites*, not at the JSON level itself — so a missing key in JSON would surface at runtime, not compile time. Acceptable trade-off for v1; the test plan exercises each key end-to-end.
- `npm run build` — clean.

## 14. Deliverables

A single PR (extending `feature/home-farm-grid` or a fresh branch — see the implementation plan for the call) containing the file list in §3 plus the i18n additions for `toasts`, `cart`, and `notFound` namespaces.

## 15. Follow-ups (not in this PR)

- Migrate `/ucet` inline success banners to toasts if/when we decide the consistency is worth it.
- Add a `cookies()`-based flash-message helper for Server Actions if/when we have a Server Action that needs to redirect with a toast (current Phase 3a forms all use REST + client-side `router.push`, so the URL-param pattern suffices).
- Brand-color the toaster (override the sonner default green/red/blue with `--color-brand-*` tokens) if the defaults look off against the dark-green theme.
- Possibly switch toast position to `top-center` if user feedback suggests bottom-right is too easy to miss.
