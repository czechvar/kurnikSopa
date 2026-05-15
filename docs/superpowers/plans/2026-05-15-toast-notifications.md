# Toast Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a site-wide toast notification system (sonner), ship the missing `/kosik` page, and migrate the existing `/prihlaseni` success banners to toasts.

**Architecture:** sonner library + bilingual copy via next-intl. Two trigger paths: client-side `import { toast } from 'sonner'`, and server-side `redirect()` with a typed `?toast=&type=` query that a layout-mounted `<ToastFromQuery/>` consumes and strips. A typed string-union of allowed toast keys prevents drift between caller, URL, and i18n.

**Tech Stack:** Next 15, React 19, sonner, next-intl v3, Payload v3 (for the cart's `payload.auth()` check), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-05-15-toast-notifications-design.md`

**Engineering ground rules:**
- No test framework in the repo. Verification is manual against the spec §13 checklist plus build/tsc smoke. Do not introduce Vitest/Playwright in this PR.
- TypeScript strict, no `any`. Conventional commits (`feat:`, `fix:`, `docs:`).
- Forms stay `'use client'`. Pages stay Server Components.
- All user-facing strings via `next-intl`. No hardcoded CZ/EN in JSX.
- Branch: continue on `feature/home-farm-grid` (already has the home grid + footer auth move; adding toast work to the same PR keeps the layout changes together). Last commit on branch when starting: `b0ed9e5` (the spec).
- After every set of meaningful edits: `npx tsc --noEmit` must return clean.

---

## File Structure

**Created in this plan:**
```
src/lib/toast-keys.ts                       — type-safe key/type unions + toastQuery + buildToastUrl
src/components/common/Toaster.tsx           — sonner Toaster mount with brand config
src/components/common/ToastFromQuery.tsx    — client component that reads ?toast= and fires
src/app/(frontend)/[locale]/kosik/page.tsx  — Server Component, auth-gated cart placeholder
src/app/(frontend)/[locale]/not-found.tsx   — 404 page inside the locale group (defense-in-depth)
```

**Modified:**
```
package.json                                — add sonner
src/app/(frontend)/[locale]/layout.tsx      — mount Toaster + ToastFromQuery
src/app/(frontend)/[locale]/prihlaseni/page.tsx — drop inline banner block
src/components/auth/VerifyEmailClient.tsx   — redirect target switches to toast query
src/components/auth/ResetPasswordForm.tsx   — redirect target switches to toast query
messages/cs.json                            — add toasts.*, cart.*, notFound.* namespaces
messages/en.json                            — same
```

---

## Task 1: Install sonner

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install sonner**

```bash
npm install sonner
```

Expected: `sonner` added under `dependencies`, lockfile updated.

- [ ] **Step 2: Sanity build**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (Sonner just installed; no usage yet, so no new errors.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(toast): install sonner"
```

---

## Task 2: Toast keys module

**Files:**
- Create: `src/lib/toast-keys.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/toast-keys.ts`:

```ts
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

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/toast-keys.ts
git commit -m "feat(toast): typed key+type unions and URL/query helpers"
```

---

## Task 3: Toaster wrapper

**Files:**
- Create: `src/components/common/Toaster.tsx`

- [ ] **Step 1: Create the file**

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

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/Toaster.tsx
git commit -m "feat(toast): brand-styled sonner Toaster wrapper"
```

---

## Task 4: ToastFromQuery client component

**Files:**
- Create: `src/components/common/ToastFromQuery.tsx`

- [ ] **Step 1: Create the file**

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

Notes for the implementer:
- Imports from `'next/navigation'`, not `'@/lib/i18n/routing'` — we don't need locale-aware routing here, just to strip params from the current URL.
- `useTranslations('toasts')` requires the `toasts` namespace to exist in `messages/cs.json` and `messages/en.json` (added in Task 5).
- If you run TS now it may complain about the `t(\`${key}.title\`)` because next-intl's typed translations expect a literal string. Use `// @ts-expect-error` only if necessary, but try first without — next-intl typically accepts dotted-path strings at runtime. If TS rejects, cast with `t(\`${key}.title\` as 'loginRequiredCart.title')` or similar; report what was needed.

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If you hit the typed-translation issue above, the simplest fix is `t(\`${key}.title\` as Parameters<typeof t>[0])`. Try without a cast first.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/ToastFromQuery.tsx
git commit -m "feat(toast): client component that fires toasts from URL query params"
```

---

## Task 5: i18n strings (toasts + cart + notFound)

**Files:**
- Modify: `messages/cs.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add to `messages/cs.json`**

Open the file. Find the closing brace of the last top-level namespace and add three new top-level namespaces (preserving existing keys):

```json
"toasts": {
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
},
"cart": {
  "title": "Košík",
  "comingSoon": "Košík zatím připravujeme. Vracíme se s ním brzy."
},
"notFound": {
  "body": "Tady kuřata nebydlí. Stránka, kterou hledáš, neexistuje.",
  "home": "Zpět na úvod"
}
```

Important: read the file first to see what comes before. Insert these new keys as siblings to existing top-level namespaces like `auth`, `account`, `nav`, `home`, etc. Add a comma after the previous closing `}` so the JSON stays valid.

- [ ] **Step 2: Add to `messages/en.json`**

Same shape with English copy:

```json
"toasts": {
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
},
"cart": {
  "title": "Cart",
  "comingSoon": "We're still building the cart. Coming soon."
},
"notFound": {
  "body": "No chickens live here. The page you're looking for doesn't exist.",
  "home": "Back to home"
}
```

- [ ] **Step 3: Validate JSON parses + TS check**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/cs.json'))"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))"
npx tsc --noEmit
```

Expected: both `node` calls return without output (JSON valid). TS clean.

- [ ] **Step 4: Commit**

```bash
git add messages/cs.json messages/en.json
git commit -m "feat(toast): CZ/EN i18n for toasts, cart placeholder, and 404"
```

---

## Task 6: Mount Toaster + ToastFromQuery in the layout

**Files:**
- Modify: `src/app/(frontend)/[locale]/layout.tsx`

- [ ] **Step 1: Update the layout**

Read `src/app/(frontend)/[locale]/layout.tsx` first. Add three imports (Suspense, Toaster, ToastFromQuery):

```ts
import { Suspense } from 'react'
import { Toaster } from '@/components/common/Toaster'
import { ToastFromQuery } from '@/components/common/ToastFromQuery'
```

Then update the JSX inside the body to add the Toaster + ToastFromQuery after the FooterComponent:

```tsx
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

The Suspense wrapper is required: `useSearchParams()` triggers a build-time error in Next 15 production builds without one.

- [ ] **Step 2: TS check + dev server smoke**

```bash
npx tsc --noEmit
```

Then in another terminal:

```bash
docker-compose up -d
npm run dev
```

Wait ~10 seconds, then curl the home page:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/cs/
```

Expected: 200. (Use port 3001 if 3000 is occupied.) The page won't visibly toast anything yet — that comes in Task 7+. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/layout.tsx
git commit -m "feat(toast): mount Toaster and ToastFromQuery in locale layout"
```

---

## Task 7: /kosik page (Server Component, auth-gated)

**Files:**
- Create: `src/app/(frontend)/[locale]/kosik/page.tsx`

- [ ] **Step 1: Create the file**

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

  const t = await getTranslations({ locale, namespace: 'cart' })
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <p className="text-text-secondary">{t('comingSoon')}</p>
    </div>
  )
}
```

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

If TS rejects the `href: { pathname, query }` object form (next-intl's typed `redirect` may not accept arbitrary query keys on a pathname that has no `[token]`), the fallback is:

```ts
import { redirect as nextRedirect } from 'next/navigation'
// ...
nextRedirect(`/${locale}/${locale === 'en' ? 'register' : 'registrace'}?toast=loginRequiredCart&type=info`)
```

Try the typed form first. If it fails, use the fallback and note in the commit message which path was taken.

- [ ] **Step 3: HTTP smoke**

```bash
docker-compose up -d
npm run dev
```

Then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/cs/kosik
```

Expected: 200 (final response after the redirect lands you on registrace). Without `-L` you should see a 3xx. Use port 3001 if needed. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/kosik/
git commit -m "feat(cart): /kosik server component with auth-gated redirect and placeholder"
```

---

## Task 8: locale-group not-found.tsx

**Files:**
- Create: `src/app/(frontend)/[locale]/not-found.tsx`

- [ ] **Step 1: Create the file**

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

Note: Next.js's `not-found.tsx` inside a route segment doesn't receive `params` (no locale prop), so we use `getTranslations()` without a locale argument — it picks up the request's locale automatically from `next-intl`'s server context.

- [ ] **Step 2: TS check + smoke**

```bash
npx tsc --noEmit
```

Then with the dev server running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/cs/this-route-does-not-exist
```

Expected: 404 status code, but the response body is the new 404 page rendered inside the locale layout (no "Missing html/body" crash). If the curl returns a 200 with a 404 body, that's also fine — Next sometimes serves not-found pages with 200. Either way, the page should render without runtime errors. Use port 3001 if needed.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/not-found.tsx
git commit -m "feat(404): localized not-found page inside locale group"
```

---

## Task 9: Migrate /prihlaseni inline banners → toast redirects

**Files:**
- Modify: `src/app/(frontend)/[locale]/prihlaseni/page.tsx`
- Modify: `src/components/auth/VerifyEmailClient.tsx`
- Modify: `src/components/auth/ResetPasswordForm.tsx`

- [ ] **Step 1: Strip the banner block from `/prihlaseni/page.tsx`**

Read the file first. The current shape is:

```tsx
const { status } = await searchParams
// ...
let banner: string | null = null
if (status === 'verified') banner = t('banners.verified')
if (status === 'reset-ok') banner = t('banners.resetOk')

return (
  <div className="max-w-md mx-auto px-6 py-12">
    <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
    {banner && (
      <div role="status" className="mb-6 rounded-lg bg-green-50 text-green-800 px-4 py-3">
        {banner}
      </div>
    )}
    <LoginForm />
  </div>
)
```

Remove the `status`/`banner` lines and the conditional banner JSX. The page now becomes:

```tsx
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { LoginForm } from '@/components/auth/LoginForm'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const t = await getTranslations({ locale, namespace: 'auth.login' })

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <LoginForm />
    </div>
  )
}
```

Notes:
- Drops the `searchParams` destructure since we no longer read `status`.
- Drops `searchParams` from the `Props` type for the same reason.
- The `auth.login.banners.*` i18n keys in `messages/*.json` are now unused but harmless. Leaving them; can be cleaned up in a follow-up.

- [ ] **Step 2: Update `VerifyEmailClient.tsx` redirect target**

Open `src/components/auth/VerifyEmailClient.tsx`. Find the line:

```tsx
router.replace('/prihlaseni?status=verified')
```

Change it to:

```tsx
router.replace('/prihlaseni?toast=emailVerified&type=success')
```

That's the only edit in this file.

- [ ] **Step 3: Update `ResetPasswordForm.tsx` redirect target**

Open `src/components/auth/ResetPasswordForm.tsx`. Find:

```tsx
router.push('/prihlaseni?status=reset-ok')
```

Change to:

```tsx
router.push('/prihlaseni?toast=passwordReset&type=success')
```

- [ ] **Step 4: TS check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: End-to-end smoke**

```bash
docker-compose up -d
npm run dev
```

1. Visit `/cs/prihlaseni?toast=emailVerified&type=success` directly in a browser. Expected: page renders, green/success toast appears bottom-right with "Vajíčko snesené, e-mail ověřený. / Můžeš se přihlásit." After a moment, the URL strips back to `/cs/prihlaseni`.
2. Repeat with `/cs/prihlaseni?toast=passwordReset&type=success`. Expected: "Husy ti dávají zelenou. / Přihlas se s novým heslem."
3. Repeat with `/cs/prihlaseni?toast=loginRequiredCart&type=info`. Expected: blue/info toast with henhouse copy.
4. Visit `/cs/prihlaseni?toast=bogus&type=success`. Expected: no toast fires, no error in console, URL not stripped (or stripped — depending on implementation).
5. Refresh the page after a toast fires. Expected: toast does NOT refire (params already stripped).

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/prihlaseni/page.tsx src/components/auth/VerifyEmailClient.tsx src/components/auth/ResetPasswordForm.tsx
git commit -m "feat(toast): migrate /prihlaseni success banners to toasts"
```

---

## Task 10: Full §13 verification pass

**Files:** none expected.

This is the full manual checklist from spec §13. Run it locally on a fresh state to confirm everything wires together end-to-end.

- [ ] **Step 1: Build + automated**

```bash
npm run build
```

Expected: clean compile, all routes including `/[locale]/kosik` listed in the route table.

- [ ] **Step 2: Cart redirect (logged out)**

Sign out if needed. Click Košík in the header from any page.
- Expected: lands on `/cs/registrace` for a split second with `?toast=loginRequiredCart&type=info`, then params strip, blue/info toast appears bottom-right.
- Repeat at `/en/cart` — expect `…/register?toast=…` and the EN copy.

- [ ] **Step 3: Cart placeholder (logged in)**

Log in. Click Košík. Expected: `/cs/kosik` renders the "Cart coming soon" placeholder. No toast fires.

- [ ] **Step 4: Email verification toast**

Sign up a fresh test user, click the verify link in the dev terminal email log.
Expected: lands on `/cs/prihlaseni`, params strip, green success toast.

- [ ] **Step 5: Password reset toast**

Trigger forgot-password, click reset link, set new password.
Expected: lands on `/cs/prihlaseni`, toast fires.

- [ ] **Step 6: No refire on back/forward**

After a toast fires, hit browser back, then forward. Toast should NOT appear again.

- [ ] **Step 7: 404 page**

Visit `/cs/this-route-does-not-exist`.
Expected: 404 page renders with header/footer intact, no runtime errors in the console.

- [ ] **Step 8: Accessibility quick pass**

- Each toast has role status/alert (sonner default).
- Close button reachable via Tab.
- Mobile viewport (iPhone): toast adapts, no horizontal overflow.

This task creates no commits unless a bug surfaces. If any check fails, fix and commit as its own `fix(toast): ...` commit.

---

## Post-plan handoff

After all tasks complete:
1. `git push -u origin feature/home-farm-grid` (branch already exists on origin from earlier home-grid work; this push adds the toast commits on top).
2. The existing PR on `feature/home-farm-grid` picks up these commits automatically — no need to open a new one. Update the PR description to mention toast + cart in addition to the home grid.
3. Vercel preview will redeploy. Walk through Task 10's checklist on the preview URL.
4. Merge once preview verified.
