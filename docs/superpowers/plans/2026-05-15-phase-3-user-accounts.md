# Phase 3 — User Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the email-and-password slice of Phase 3 — signup with email verification, login/logout, forgot/reset password, and a logged-in profile page (personal info, addresses CRUD, change password, delete account) on `feature/phase-3-user-accounts`.

**Architecture:** All pages are Next 15 Server Components under `src/app/(frontend)/[locale]/`. Forms are client components that POST directly to Payload v3's built-in REST endpoints (`/api/users/...`) — Payload sets the HTTP-only JWT session cookie. Server Components read the current user via `payload.auth({ headers: await headers() })`. One custom collection endpoint (`POST /api/users/resend-verification`) covers the resend-verification gap. Emails are sent through `@payloadcms/email-resend` (with a graceful fallback to Payload's console logger when `RESEND_API_KEY` is unset).

**Tech Stack:** Next 15, React 19, Payload CMS v3.84, `@payloadcms/email-resend`, `next-intl` v3, Tailwind 4, Postgres (Docker local / Neon prod), Resend.

**Spec:** `docs/superpowers/specs/2026-05-15-phase-3-user-accounts-design.md`

**Engineering ground rules:**
- No test framework exists in this repo. Verification is **manual against the checklist in spec §9** plus build/type/migration smoke checks. Do not introduce Vitest/Playwright in this PR.
- TypeScript strict, no `any`. Conventional commits (`feat:`, `fix:`, `docs:`). Czech route slugs as folder names; English slugs are aliased in `routing.ts`.
- After **every** Users-collection change: `npm run generate:types` → `npx payload migrate:create` → `npx payload migrate`. Commit the regenerated `payload-types.ts` and the new migration file together with the source change.
- Forms are all `'use client'`. Pages stay Server Components.
- All user-facing strings via `next-intl`. Never hardcode CZ or EN in JSX.
- Start `docker-compose up -d` before any DB-touching task.

---

## File Structure

**Created in this plan:**
```
src/lib/email/links.ts                        — buildAuthUrl helper
src/lib/email/templates.ts                    — verifyEmailTemplate, forgotPasswordTemplate
src/lib/auth/errors.ts                        — mapPayloadError + i18n key map
src/collections/Users/endpoints/resendVerification.ts
src/app/(frontend)/[locale]/registrace/page.tsx
src/app/(frontend)/[locale]/prihlaseni/page.tsx
src/app/(frontend)/[locale]/zapomenute-heslo/page.tsx
src/app/(frontend)/[locale]/obnova-hesla/[token]/page.tsx
src/app/(frontend)/[locale]/overeni-emailu/[token]/page.tsx
src/app/(frontend)/[locale]/ucet/page.tsx
src/components/auth/SignupForm.tsx
src/components/auth/LoginForm.tsx
src/components/auth/ForgotPasswordForm.tsx
src/components/auth/ResetPasswordForm.tsx
src/components/auth/VerifyEmailClient.tsx
src/components/account/PersonalInfoForm.tsx
src/components/account/AddressesManager.tsx
src/components/account/ChangePasswordForm.tsx
src/components/account/DeleteAccountSection.tsx
src/components/layout/HeaderUserMenu.tsx
src/components/layout/LogoutButton.tsx
src/migrations/<timestamp>_users_auth.{ts,json}   (generated)
```

**Modified:**
```
.env.example
src/payload.config.ts
src/collections/Users/index.ts
src/lib/i18n/routing.ts
src/components/layout/Header.tsx
src/app/(frontend)/[locale]/layout.tsx
src/payload-types.ts                          (regenerated)
messages/cs.json
messages/en.json
src/seed.ts                                   (legal-page stubs)
```

---

## Task 1: Install Resend adapter + add env vars

**Files:**
- Modify: `.env.example`
- Modify: `repo/package.json` (via `npm install`)

- [ ] **Step 1: Install the Resend email adapter**

Run from `repo/`:

```bash
npm install @payloadcms/email-resend
```

Expected: package added under `dependencies`, lockfile updated.

- [ ] **Step 2: Add the new env vars to `.env.example`**

Edit `.env.example` — locate the existing `# Email` section near the bottom. Replace the existing email block with:

```
# Email (Resend transactional)
# Leave empty in local dev to use Payload's console logger
RESEND_API_KEY=re_...
# Until kurniksopa.cz is verified in Resend, use onboarding@resend.dev on previews
EMAIL_FROM=info@kurniksopa.cz
```

Leave `NEXT_PUBLIC_SITE_URL` alone — it already exists and we'll reuse it for verification/reset links.

- [ ] **Step 3: Run a sanity build**

```bash
npm run build
```

Expected: build completes without TypeScript errors. (Resend adapter not yet wired into config — installing alone shouldn't break anything.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(auth): install Resend email adapter, document env vars"
```

---

## Task 2: Wire Resend adapter into `payload.config.ts`

**Files:**
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Add the email adapter (conditional on RESEND_API_KEY)**

Edit `src/payload.config.ts`. Add the import near the other adapter imports:

```ts
import { resendAdapter } from '@payloadcms/email-resend'
```

Inside the `buildConfig({ ... })` call, add an `email` property — alphabetically near `editor`:

```ts
email: process.env.RESEND_API_KEY
  ? resendAdapter({
      defaultFromAddress: process.env.EMAIL_FROM ?? 'info@kurniksopa.cz',
      defaultFromName: 'Kurník Šopa',
      apiKey: process.env.RESEND_API_KEY,
    })
  : undefined,
```

When `RESEND_API_KEY` is unset, Payload uses its built-in console email logger.

- [ ] **Step 2: Verify the dev server starts cleanly**

```bash
docker-compose up -d
npm run dev
```

Visit `http://localhost:3000/admin` and confirm it loads. Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add src/payload.config.ts
git commit -m "feat(auth): wire Resend email adapter with console-logger fallback"
```

---

## Task 3: Add email link & template helpers

**Files:**
- Create: `src/lib/email/links.ts`
- Create: `src/lib/email/templates.ts`

- [ ] **Step 1: Create `src/lib/email/links.ts`**

```ts
type AuthLinkKind = 'verify' | 'reset'

export function buildAuthUrl(
  locale: 'cs' | 'en',
  kind: AuthLinkKind,
  token: string,
  email?: string,
): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const slug =
    kind === 'verify'
      ? locale === 'en'
        ? 'verify-email'
        : 'overeni-emailu'
      : locale === 'en'
        ? 'reset-password'
        : 'obnova-hesla'
  const url = `${base}/${locale}/${slug}/${token}`
  return email ? `${url}?email=${encodeURIComponent(email)}` : url
}
```

- [ ] **Step 2: Create `src/lib/email/templates.ts`**

```ts
import { buildAuthUrl } from './links'

type Locale = 'cs' | 'en'

const t = {
  verify: {
    cs: {
      subject: 'Ověřte svůj e-mail',
      greeting: (name?: string) => (name ? `Dobrý den ${name},` : 'Dobrý den,'),
      intro:
        'Děkujeme za registraci na Kurník Šopa. Pro dokončení prosím ověřte svou e-mailovou adresu kliknutím na tlačítko níže.',
      button: 'Ověřit e-mail',
      fallback: 'Pokud tlačítko nefunguje, otevřete tento odkaz v prohlížeči:',
      footer: 'Pokud jste se neregistrovali, můžete tento e-mail ignorovat.',
    },
    en: {
      subject: 'Verify your email',
      greeting: (name?: string) => (name ? `Hello ${name},` : 'Hello,'),
      intro:
        'Thanks for signing up to Kurník Šopa. Please verify your email address by clicking the button below.',
      button: 'Verify email',
      fallback: 'If the button does not work, open this link in your browser:',
      footer: 'If you did not sign up, you can ignore this email.',
    },
  },
  forgot: {
    cs: {
      subject: 'Obnovení hesla',
      greeting: (name?: string) => (name ? `Dobrý den ${name},` : 'Dobrý den,'),
      intro: 'Obdrželi jsme žádost o obnovení hesla pro váš účet. Pokračujte kliknutím na tlačítko níže.',
      button: 'Obnovit heslo',
      fallback: 'Pokud tlačítko nefunguje, otevřete tento odkaz v prohlížeči:',
      footer: 'Pokud jste o obnovení nežádali, můžete tento e-mail ignorovat — vaše heslo se nezmění.',
    },
    en: {
      subject: 'Reset your password',
      greeting: (name?: string) => (name ? `Hello ${name},` : 'Hello,'),
      intro: 'We received a request to reset the password for your account. Click the button below to continue.',
      button: 'Reset password',
      fallback: 'If the button does not work, open this link in your browser:',
      footer: 'If you did not request a reset, you can ignore this email — your password will not change.',
    },
  },
} as const

function wrap(locale: Locale, body: string): string {
  const tagline = locale === 'en' ? 'Czech country farm' : 'Český statek'
  return `<!DOCTYPE html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#f6f3eb;font-family:system-ui,-apple-system,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;">
      <div style="font-weight:800;font-size:20px;color:#2d5016;margin-bottom:24px;">Kurník Šopa</div>
      ${body}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
        Kurník Šopa · ${tagline}
      </div>
    </div>
  </div>
</body>
</html>`
}

export function verifyEmailTemplate(input: {
  locale: Locale
  token: string
  email: string
  firstName?: string
}): string {
  const c = t.verify[input.locale]
  const link = buildAuthUrl(input.locale, 'verify', input.token, input.email)
  return wrap(
    input.locale,
    `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.firstName)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${c.intro}</p>
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${c.button}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${c.fallback}</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#2d5016;">${link}</a></p>
    <p style="margin:0;font-size:13px;color:#6b7280;">${c.footer}</p>
    `,
  )
}

export function forgotPasswordTemplate(input: {
  locale: Locale
  token: string
  firstName?: string
}): string {
  const c = t.forgot[input.locale]
  const link = buildAuthUrl(input.locale, 'reset', input.token)
  return wrap(
    input.locale,
    `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.firstName)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${c.intro}</p>
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${c.button}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${c.fallback}</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#2d5016;">${link}</a></p>
    <p style="margin:0;font-size:13px;color:#6b7280;">${c.footer}</p>
    `,
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/
git commit -m "feat(auth): add email link builder and verification/reset templates"
```

---

## Task 4: Update `Users` collection — verify, forgotPassword, access, field locks

**Files:**
- Modify: `src/collections/Users/index.ts`

- [ ] **Step 1: Rewrite the collection with the full auth + access config**

Replace the entire contents of `src/collections/Users/index.ts` with:

```ts
import type { CollectionConfig, Access, FieldAccess } from 'payload'
import { verifyEmailTemplate, forgotPasswordTemplate } from '@/lib/email/templates'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return { id: { equals: req.user.id } }
}

const adminFieldOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: ({ req }) =>
        req.locale === 'en' ? 'Verify your email' : 'Ověřte svůj e-mail',
      generateEmailHTML: ({ req, token, user }) =>
        verifyEmailTemplate({
          locale: (req.locale === 'en' ? 'en' : 'cs'),
          token,
          email: (user as { email: string }).email,
          firstName: (user as { firstName?: string }).firstName,
        }),
    },
    forgotPassword: {
      generateEmailSubject: ({ req }) =>
        req.locale === 'en' ? 'Reset your password' : 'Obnovení hesla',
      generateEmailHTML: ({ req, token, user }) =>
        forgotPasswordTemplate({
          locale: (req.locale === 'en' ? 'en' : 'cs'),
          token: token ?? '',
          firstName: (user as { firstName?: string } | undefined)?.firstName,
        }),
    },
  },
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: () => true,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdminOrSelf,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Customer', value: 'customer' },
      ],
      required: true,
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'addresses',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'street', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'zip', type: 'text', required: true },
      ],
    },
  ],
}
```

Notes:
- `email` is explicitly declared (Payload's `auth: true` adds it implicitly, but we want field-level update locking, so we declare it).
- `unique: true` on `email` produces a 400 on duplicate signup — `mapPayloadError` translates that.
- `role` field locked to admin-only updates → no privilege escalation via PATCH.

- [ ] **Step 2: Regenerate types**

```bash
npm run generate:types
```

Expected: `src/payload-types.ts` updates. Confirm `User` type now includes `_verified?: boolean | null` (Payload adds these implicitly for verify-enabled collections).

- [ ] **Step 3: Create the migration**

```bash
npx payload migrate:create --name users_auth
```

Expected: new files appear in `src/migrations/<timestamp>_users_auth.ts` and `<timestamp>_users_auth.json` adding `_verified`, `_verificationToken`, and `_email_verified` related columns. Inspect the generated SQL briefly to confirm.

- [ ] **Step 4: Apply the migration**

```bash
npx payload migrate
```

Expected: "Migrating <name>… Done."

- [ ] **Step 5: Manual smoke verification**

Start `npm run dev`, log in to `/admin` with the existing admin (created in seed). Confirm:
- Admin panel still loads.
- On a `users` row, the new `_verified` column is visible.
- Creating a fresh test user via the admin UI works and `_verified` defaults to `false`.

Stop the dev server.

- [ ] **Step 6: Commit (collection + types + migration together)**

```bash
git add src/collections/Users/index.ts src/payload-types.ts src/migrations/
git commit -m "feat(auth): enable email verification, forgot-password, and access rules on Users"
```

---

## Task 5: Custom resend-verification endpoint

**Files:**
- Create: `src/collections/Users/endpoints/resendVerification.ts`
- Modify: `src/collections/Users/index.ts`

- [ ] **Step 1: Create the endpoint handler**

Create `src/collections/Users/endpoints/resendVerification.ts`:

```ts
import type { Endpoint } from 'payload'

export const resendVerification: Endpoint = {
  path: '/resend-verification',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as { email?: string } | undefined
    const email = body?.email?.trim().toLowerCase()

    // Always return 200 — anti-enumeration.
    if (!email) {
      return Response.json({ ok: true })
    }

    const { docs } = await req.payload.find({
      collection: 'users',
      where: {
        and: [
          { email: { equals: email } },
          { _verified: { equals: false } },
        ],
      },
      limit: 1,
      depth: 0,
    })

    const user = docs[0]
    if (!user) {
      return Response.json({ ok: true })
    }

    // Triggers Payload to regenerate _verificationToken and re-send via the
    // collection's verify.generateEmailHTML.
    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { _verified: false } as never,
      req,
      forceVerificationEmail: true,
    } as Parameters<typeof req.payload.update>[0])

    return Response.json({ ok: true })
  },
}
```

Note: Payload's `update` accepts a `forceVerificationEmail: true` flag that re-sends the verification email even when no fields change. We pass it via `as` because the typed signature may not list it depending on the version — check the source if the linter complains and switch to using `req.payload.sendEmail` directly with a freshly generated token via `req.payload.collections.users.config.auth.verify` API. The flag is the simpler path; fall back only if it fails at runtime.

- [ ] **Step 2: Register the endpoint in the Users collection**

Edit `src/collections/Users/index.ts`. Add the import:

```ts
import { resendVerification } from './endpoints/resendVerification'
```

Add the `endpoints` array at the top level of the `Users` config (alongside `access`, `fields`):

```ts
endpoints: [resendVerification],
```

- [ ] **Step 3: Run dev server and smoke-test the endpoint**

```bash
docker-compose up -d
npm run dev
```

In another terminal, create a fresh unverified user via the admin (Task 4 verified this works). Then:

```bash
curl -s -X POST http://localhost:3000/api/users/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response: `{"ok":true}`. The dev server console should print an email log entry with a verification link.

Repeat with a non-existent email — same `{"ok":true}` response, no email log.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/collections/Users/
git commit -m "feat(auth): add resend-verification endpoint with anti-enumeration response"
```

---

## Task 6: Auth error mapping helper

**Files:**
- Create: `src/lib/auth/errors.ts`

- [ ] **Step 1: Create the helper**

```ts
type ErrorContext = 'signup' | 'login' | 'forgot' | 'reset' | 'verify' | 'account'

interface PayloadErrorBody {
  errors?: Array<{ message?: string; data?: { code?: string; field?: string } }>
  message?: string
}

export function mapPayloadError(
  status: number,
  body: unknown,
  context: ErrorContext,
): string {
  const b = (body ?? {}) as PayloadErrorBody
  const message = (b.message ?? b.errors?.[0]?.message ?? '').toLowerCase()
  const field = b.errors?.[0]?.data?.field
  const code = b.errors?.[0]?.data?.code

  if (context === 'signup') {
    if (field === 'email' && (code === 'unique' || message.includes('already'))) {
      return 'auth.signup.errors.emailTaken'
    }
    if (field === 'email') return 'auth.signup.errors.emailInvalid'
    if (field === 'password') return 'auth.signup.errors.passwordTooShort'
    return 'auth.signup.errors.generic'
  }

  if (context === 'login') {
    if (status === 401 && message.includes('verified')) {
      return 'auth.login.errors.notVerified'
    }
    if (status === 401) return 'auth.login.errors.invalidCredentials'
    return 'auth.login.errors.generic'
  }

  if (context === 'reset') {
    if (message.includes('token') || status === 400) {
      return 'auth.reset.errors.tokenExpired'
    }
    return 'auth.reset.errors.generic'
  }

  if (context === 'verify') {
    return 'auth.verify.tokenExpired'
  }

  if (context === 'account') {
    if (message.includes('password')) return 'account.password.errors.currentWrong'
    return 'account.personal.errors.generic'
  }

  return `${context}.errors.generic`
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/errors.ts
git commit -m "feat(auth): map Payload REST errors to i18n keys"
```

---

## Task 7: Add auth routes to next-intl routing

**Files:**
- Modify: `src/lib/i18n/routing.ts`

- [ ] **Step 1: Add the six new pathname entries**

Edit `src/lib/i18n/routing.ts`. In the `pathnames` object, add (preserving alphabetical-ish order with existing entries):

```ts
    '/registrace': {
      cs: '/registrace',
      en: '/register',
    },
    '/prihlaseni': {
      cs: '/prihlaseni',
      en: '/login',
    },
    '/zapomenute-heslo': {
      cs: '/zapomenute-heslo',
      en: '/forgot-password',
    },
    '/obnova-hesla/[token]': {
      cs: '/obnova-hesla/[token]',
      en: '/reset-password/[token]',
    },
    '/overeni-emailu/[token]': {
      cs: '/overeni-emailu/[token]',
      en: '/verify-email/[token]',
    },
    '/ucet': {
      cs: '/ucet',
      en: '/account',
    },
```

- [ ] **Step 2: Verify TypeScript and build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/routing.ts
git commit -m "feat(auth): add localized pathnames for auth and account routes"
```

---

## Task 8: i18n strings (CZ + EN)

**Files:**
- Modify: `messages/cs.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add the auth + account + email namespaces**

Open `messages/cs.json` and add (at the top level of the object, preserving any existing keys) — keep alphabetical order with existing namespaces:

```json
  "auth": {
    "signup": {
      "title": "Registrace",
      "fields": {
        "firstName": "Jméno",
        "lastName": "Příjmení",
        "email": "E-mail",
        "phone": "Telefon",
        "password": "Heslo",
        "passwordConfirm": "Heslo znovu",
        "street": "Ulice a č.p.",
        "city": "Město",
        "zip": "PSČ"
      },
      "submit": "Vytvořit účet",
      "agreement": "Souhlasím se zpracováním osobních údajů a obchodními podmínkami.",
      "haveAccount": "Už máte účet?",
      "loginLink": "Přihlásit se",
      "errors": {
        "emailTaken": "Tento e-mail je již registrován.",
        "emailInvalid": "Neplatný e-mail.",
        "passwordTooShort": "Heslo musí mít alespoň 8 znaků.",
        "passwordMismatch": "Hesla se neshodují.",
        "zipInvalid": "PSČ musí mít 5 číslic (např. 110 00).",
        "required": "Toto pole je povinné.",
        "agreementRequired": "Pro registraci je potřeba souhlas.",
        "generic": "Registrace selhala. Zkuste to prosím znovu."
      },
      "success": {
        "checkEmailTitle": "Zkontrolujte svou schránku",
        "checkEmailBody": "Poslali jsme vám e-mail s odkazem pro ověření účtu."
      }
    },
    "login": {
      "title": "Přihlášení",
      "email": "E-mail",
      "password": "Heslo",
      "submit": "Přihlásit se",
      "forgotLink": "Zapomněli jste heslo?",
      "noAccount": "Nemáte účet?",
      "registerLink": "Registrovat",
      "banners": {
        "verified": "E-mail ověřen, můžete se přihlásit.",
        "resetOk": "Heslo bylo změněno. Přihlaste se novým heslem."
      },
      "errors": {
        "invalidCredentials": "Špatný e-mail nebo heslo.",
        "notVerified": "E-mail dosud nebyl ověřen. Zkontrolujte svou schránku.",
        "generic": "Přihlášení selhalo. Zkuste to prosím znovu."
      }
    },
    "forgot": {
      "title": "Zapomenuté heslo",
      "intro": "Zadejte svou e-mailovou adresu a my vám pošleme odkaz pro obnovení hesla.",
      "email": "E-mail",
      "submit": "Odeslat odkaz",
      "successBody": "Pokud k zadanému e-mailu existuje účet, odeslali jsme na něj odkaz pro obnovení hesla."
    },
    "reset": {
      "title": "Obnovení hesla",
      "password": "Nové heslo",
      "passwordConfirm": "Nové heslo znovu",
      "submit": "Nastavit nové heslo",
      "errors": {
        "tokenExpired": "Odkaz vypršel nebo je neplatný.",
        "passwordTooShort": "Heslo musí mít alespoň 8 znaků.",
        "passwordMismatch": "Hesla se neshodují.",
        "generic": "Obnovení hesla selhalo. Zkuste to prosím znovu."
      }
    },
    "verify": {
      "verifying": "Ověřujeme váš e-mail…",
      "success": "E-mail ověřen.",
      "tokenExpired": "Odkaz vypršel nebo je neplatný.",
      "resendLink": "Poslat nový odkaz",
      "resendSent": "Pokud k tomuto e-mailu existuje účet, poslali jsme nový odkaz."
    }
  },
  "account": {
    "title": "Můj účet",
    "personal": {
      "title": "Osobní údaje",
      "firstName": "Jméno",
      "lastName": "Příjmení",
      "phone": "Telefon",
      "save": "Uložit",
      "successSaved": "Údaje uloženy.",
      "errors": {
        "generic": "Uložení selhalo. Zkuste to prosím znovu."
      }
    },
    "addresses": {
      "title": "Adresy",
      "addRow": "Přidat adresu",
      "label": "Označení (volitelné)",
      "street": "Ulice a č.p.",
      "city": "Město",
      "zip": "PSČ",
      "save": "Uložit změny",
      "remove": "Odstranit",
      "confirmRemove": "Opravdu odstranit tuto adresu?",
      "empty": "Zatím nemáte žádné adresy.",
      "successSaved": "Adresy uloženy."
    },
    "password": {
      "title": "Změna hesla",
      "current": "Současné heslo",
      "new": "Nové heslo",
      "confirm": "Nové heslo znovu",
      "save": "Změnit heslo",
      "successSaved": "Heslo změněno.",
      "errors": {
        "currentWrong": "Současné heslo není správné.",
        "tooShort": "Heslo musí mít alespoň 8 znaků.",
        "mismatch": "Hesla se neshodují.",
        "generic": "Změna hesla selhala. Zkuste to prosím znovu."
      }
    },
    "delete": {
      "title": "Smazání účtu",
      "warning": "Tato akce je nevratná. Smaže se váš účet i historie objednávek.",
      "button": "Smazat účet",
      "confirmModal": {
        "title": "Opravdu smazat účet?",
        "body": "Pro potvrzení napište svůj e-mail.",
        "typeEmailPrompt": "Váš e-mail",
        "confirm": "Smazat trvale",
        "cancel": "Zrušit"
      },
      "errors": {
        "emailMismatch": "Zadaný e-mail se neshoduje.",
        "generic": "Mazání selhalo. Zkuste to prosím znovu."
      }
    }
  }
```

Then update the existing `nav` namespace to add the auth entries:

```json
  "nav": {
    "products": "Produkty",
    "events": "Akce",
    "about": "O nás",
    "contact": "Kontakt",
    "blog": "Blog",
    "cart": "Košík",
    "auth": {
      "login": "Přihlásit se",
      "register": "Registrovat",
      "account": "Můj účet",
      "logout": "Odhlásit se"
    }
  }
```

Preserve other top-level keys (the existing `home`, etc., if any). If the `nav` namespace doesn't have `login`/`register`/etc. yet, add the `auth` sub-namespace as shown.

- [ ] **Step 2: Mirror in `messages/en.json`**

```json
  "auth": {
    "signup": {
      "title": "Sign up",
      "fields": {
        "firstName": "First name",
        "lastName": "Last name",
        "email": "Email",
        "phone": "Phone",
        "password": "Password",
        "passwordConfirm": "Repeat password",
        "street": "Street and number",
        "city": "City",
        "zip": "ZIP"
      },
      "submit": "Create account",
      "agreement": "I agree to the privacy policy and the terms of service.",
      "haveAccount": "Already have an account?",
      "loginLink": "Log in",
      "errors": {
        "emailTaken": "This email is already registered.",
        "emailInvalid": "Invalid email.",
        "passwordTooShort": "Password must be at least 8 characters.",
        "passwordMismatch": "Passwords do not match.",
        "zipInvalid": "ZIP must be 5 digits (e.g. 110 00).",
        "required": "This field is required.",
        "agreementRequired": "Consent is required to sign up.",
        "generic": "Signup failed. Please try again."
      },
      "success": {
        "checkEmailTitle": "Check your inbox",
        "checkEmailBody": "We sent you an email with a link to verify your account."
      }
    },
    "login": {
      "title": "Log in",
      "email": "Email",
      "password": "Password",
      "submit": "Log in",
      "forgotLink": "Forgot your password?",
      "noAccount": "Don't have an account?",
      "registerLink": "Sign up",
      "banners": {
        "verified": "Email verified. You can now log in.",
        "resetOk": "Password changed. Log in with your new password."
      },
      "errors": {
        "invalidCredentials": "Wrong email or password.",
        "notVerified": "Email not yet verified. Check your inbox.",
        "generic": "Login failed. Please try again."
      }
    },
    "forgot": {
      "title": "Forgot password",
      "intro": "Enter your email and we'll send you a link to reset your password.",
      "email": "Email",
      "submit": "Send link",
      "successBody": "If an account exists for this email, we've sent a reset link to it."
    },
    "reset": {
      "title": "Reset password",
      "password": "New password",
      "passwordConfirm": "Repeat new password",
      "submit": "Set new password",
      "errors": {
        "tokenExpired": "The link expired or is invalid.",
        "passwordTooShort": "Password must be at least 8 characters.",
        "passwordMismatch": "Passwords do not match.",
        "generic": "Reset failed. Please try again."
      }
    },
    "verify": {
      "verifying": "Verifying your email…",
      "success": "Email verified.",
      "tokenExpired": "The link expired or is invalid.",
      "resendLink": "Send a new link",
      "resendSent": "If an account exists for this email, we've sent a new link."
    }
  },
  "account": {
    "title": "My account",
    "personal": {
      "title": "Personal info",
      "firstName": "First name",
      "lastName": "Last name",
      "phone": "Phone",
      "save": "Save",
      "successSaved": "Saved.",
      "errors": {
        "generic": "Save failed. Please try again."
      }
    },
    "addresses": {
      "title": "Addresses",
      "addRow": "Add address",
      "label": "Label (optional)",
      "street": "Street and number",
      "city": "City",
      "zip": "ZIP",
      "save": "Save changes",
      "remove": "Remove",
      "confirmRemove": "Remove this address?",
      "empty": "You have no addresses yet.",
      "successSaved": "Addresses saved."
    },
    "password": {
      "title": "Change password",
      "current": "Current password",
      "new": "New password",
      "confirm": "Repeat new password",
      "save": "Change password",
      "successSaved": "Password changed.",
      "errors": {
        "currentWrong": "Current password is not correct.",
        "tooShort": "Password must be at least 8 characters.",
        "mismatch": "Passwords do not match.",
        "generic": "Password change failed. Please try again."
      }
    },
    "delete": {
      "title": "Delete account",
      "warning": "This action is irreversible. Your account and order history will be deleted.",
      "button": "Delete account",
      "confirmModal": {
        "title": "Really delete your account?",
        "body": "Type your email to confirm.",
        "typeEmailPrompt": "Your email",
        "confirm": "Delete permanently",
        "cancel": "Cancel"
      },
      "errors": {
        "emailMismatch": "Email does not match.",
        "generic": "Delete failed. Please try again."
      }
    }
  }
```

Add the `nav.auth` block analogously:

```json
  "nav": {
    "products": "Products",
    "events": "Events",
    "about": "About",
    "contact": "Contact",
    "blog": "Blog",
    "cart": "Cart",
    "auth": {
      "login": "Log in",
      "register": "Sign up",
      "account": "My account",
      "logout": "Log out"
    }
  }
```

- [ ] **Step 3: Verify JSON parses and build still works**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/cs.json'))"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))"
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat(auth): add CZ/EN i18n keys for auth and account flows"
```

---

## Task 9: Login page + LoginForm (smallest end-to-end vertical)

**Why first:** logging in as the existing admin is a fast way to validate the cookie/redirect mechanics before signup adds verification complexity.

**Files:**
- Create: `src/app/(frontend)/[locale]/prihlaseni/page.tsx`
- Create: `src/components/auth/LoginForm.tsx`

- [ ] **Step 1: Create the page (Server Component)**

`src/app/(frontend)/[locale]/prihlaseni/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { LoginForm } from '@/components/auth/LoginForm'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ status?: string }>
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { status } = await searchParams

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const t = await getTranslations({ locale, namespace: 'auth.login' })

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
}
```

- [ ] **Step 2: Create the form (Client Component)**

`src/components/auth/LoginForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'
import { mapPayloadError } from '@/lib/auth/errors'

export function LoginForm() {
  const t = useTranslations('auth.login')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorKey(mapPayloadError(res.status, body, 'login'))
        setSubmitting(false)
        return
      }
      router.push('/ucet')
      router.refresh()
    } catch {
      setErrorKey('auth.login.errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {errorKey && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {t(errorKey.replace(/^auth\.login\./, ''))}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">{t('email')}</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">{t('password')}</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60"
      >
        {t('submit')}
      </button>
      <div className="flex justify-between text-sm pt-2">
        <Link href="/zapomenute-heslo" className="text-brand-green hover:underline">{t('forgotLink')}</Link>
        <span>
          {t('noAccount')} <Link href="/registrace" className="text-brand-green hover:underline">{t('registerLink')}</Link>
        </span>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Manual verification**

```bash
docker-compose up -d
npm run dev
```

Visit `http://localhost:3000/cs/prihlaseni`. Verify:
- Page renders with title "Přihlášení" and the form.
- Submit blank → HTML5 required-field prompts appear.
- Submit with admin credentials (from seed) → redirected to `/cs/ucet` (which is 404 — that's expected, page comes later). Check DevTools → Application → Cookies: `payload-token` cookie set, HttpOnly.
- Manually navigate back to `/cs/prihlaseni` — page redirects to `/cs/ucet` (auth-aware redirect works).
- Open DevTools → Application → Cookies → delete `payload-token` → reload `/cs/prihlaseni` → form is shown again.
- Submit wrong password → red error banner with "Špatný e-mail nebo heslo."

Repeat the language check at `/en/login`.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/prihlaseni/ src/components/auth/LoginForm.tsx
git commit -m "feat(auth): add login page and form posting to Payload /api/users/login"
```

---

## Task 10: Signup page + SignupForm

**Files:**
- Create: `src/app/(frontend)/[locale]/registrace/page.tsx`
- Create: `src/components/auth/SignupForm.tsx`

- [ ] **Step 1: Create the page**

`src/app/(frontend)/[locale]/registrace/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { SignupForm } from '@/components/auth/SignupForm'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
  searchParams: Promise<{ status?: string }>
}

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { status } = await searchParams

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }

  const t = await getTranslations({ locale, namespace: 'auth.signup' })

  if (status === 'check-email') {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">{t('success.checkEmailTitle')}</h1>
        <p className="text-text-secondary">{t('success.checkEmailBody')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <SignupForm />
    </div>
  )
}
```

- [ ] **Step 2: Create the form**

`src/components/auth/SignupForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/lib/i18n/routing'
import { mapPayloadError } from '@/lib/auth/errors'

const ZIP_RE = /^\d{3}\s?\d{2}$/

export function SignupForm() {
  const t = useTranslations('auth.signup')
  const tFields = useTranslations('auth.signup.fields')
  const tErr = useTranslations('auth.signup.errors')
  const router = useRouter()
  const locale = useLocale()
  const pathname = usePathname()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    street: '',
    city: '',
    zip: '',
    agreement: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrorKey, setFieldErrorKey] = useState<string | null>(null)
  const [generalErrorKey, setGeneralErrorKey] = useState<string | null>(null)

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function clientValidate(): string | null {
    if (form.password.length < 8) return 'passwordTooShort'
    if (form.password !== form.passwordConfirm) return 'passwordMismatch'
    if (!ZIP_RE.test(form.zip)) return 'zipInvalid'
    if (!form.agreement) return 'agreementRequired'
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrorKey(null)
    setGeneralErrorKey(null)

    const v = clientValidate()
    if (v) {
      setFieldErrorKey(v)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          role: 'customer',
          addresses: [
            {
              label: locale === 'en' ? 'Primary' : 'Hlavní',
              street: form.street,
              city: form.city,
              zip: form.zip,
            },
          ],
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const key = mapPayloadError(res.status, body, 'signup')
        // mapPayloadError returns the full path; strip prefix so tErr (scoped to
        // auth.signup.errors) can resolve it.
        setGeneralErrorKey(key.replace(/^auth\.signup\.errors\./, ''))
        setSubmitting(false)
        return
      }
      router.push(`${pathname}?status=check-email`)
    } catch {
      setGeneralErrorKey('generic')
      setSubmitting(false)
    }
  }

  const labelClass = 'block text-sm font-medium mb-1'
  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2'

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {(generalErrorKey || fieldErrorKey) && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {tErr((generalErrorKey ?? fieldErrorKey) as string)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="firstName">{tFields('firstName')}</label>
          <input id="firstName" required value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} className={inputClass} autoComplete="given-name" />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">{tFields('lastName')}</label>
          <input id="lastName" required value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} className={inputClass} autoComplete="family-name" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">{tFields('email')}</label>
        <input id="email" type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} autoComplete="email" />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">{tFields('phone')}</label>
        <input id="phone" type="tel" required value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClass} autoComplete="tel" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="password">{tFields('password')}</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => setField('password', e.target.value)} className={inputClass} autoComplete="new-password" />
        </div>
        <div>
          <label className={labelClass} htmlFor="passwordConfirm">{tFields('passwordConfirm')}</label>
          <input id="passwordConfirm" type="password" required minLength={8} value={form.passwordConfirm} onChange={(e) => setField('passwordConfirm', e.target.value)} className={inputClass} autoComplete="new-password" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="street">{tFields('street')}</label>
        <input id="street" required value={form.street} onChange={(e) => setField('street', e.target.value)} className={inputClass} autoComplete="address-line1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="city">{tFields('city')}</label>
          <input id="city" required value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputClass} autoComplete="address-level2" />
        </div>
        <div>
          <label className={labelClass} htmlFor="zip">{tFields('zip')}</label>
          <input id="zip" required value={form.zip} onChange={(e) => setField('zip', e.target.value)} className={inputClass} autoComplete="postal-code" />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" required checked={form.agreement} onChange={(e) => setField('agreement', e.target.checked)} className="mt-1" />
        <span>{t('agreement')}</span>
      </label>

      <button type="submit" disabled={submitting} className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60">
        {t('submit')}
      </button>

      <p className="text-sm text-center pt-2">
        {t('haveAccount')} <Link href="/prihlaseni" className="text-brand-green hover:underline">{t('loginLink')}</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Manual verification**

```bash
docker-compose up -d
npm run dev
```

Visit `http://localhost:3000/cs/registrace`. Verify:
- Fill the form with a fresh email (e.g. `test1@example.com`), valid CZ ZIP (`110 00`), passwords matching, agreement checked → submit.
- Browser navigates to `/cs/registrace?status=check-email`; "Zkontrolujte svou schránku" panel renders.
- Dev server console logs the verification email (HTML body) with a link of the form `http://localhost:3000/cs/overeni-emailu/<token>?email=test1%40example.com`.
- In Payload admin (`/admin`) the new user appears with `_verified: false`.
- Try logging in (Task 9 form) with the new credentials before verifying → red error "E-mail dosud nebyl ověřen…"
- Try signup again with the same email → red error "Tento e-mail je již registrován."
- Try with mismatched passwords / unchecked agreement / invalid ZIP → appropriate red banner.

Repeat smoke at `/en/register`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/registrace/ src/components/auth/SignupForm.tsx
git commit -m "feat(auth): add signup page and form with client validation"
```

---

## Task 11: Email verification page + VerifyEmailClient

**Files:**
- Create: `src/app/(frontend)/[locale]/overeni-emailu/[token]/page.tsx`
- Create: `src/components/auth/VerifyEmailClient.tsx`

- [ ] **Step 1: Create the page**

`src/app/(frontend)/[locale]/overeni-emailu/[token]/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the client component**

`src/components/auth/VerifyEmailClient.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type State = 'verifying' | 'success' | 'expired' | 'resent'

export function VerifyEmailClient({ token, email }: { token: string; email?: string }) {
  const t = useTranslations('auth.verify')
  const router = useRouter()
  const [state, setState] = useState<State>('verifying')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/users/verify/${encodeURIComponent(token)}`, {
          method: 'POST',
        })
        if (cancelled) return
        if (res.ok) {
          setState('success')
          router.replace('/prihlaseni?status=verified')
        } else {
          setState('expired')
        }
      } catch {
        if (!cancelled) setState('expired')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

  async function resend() {
    if (!email) return
    await fetch('/api/users/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setState('resent')
  }

  if (state === 'verifying') return <p>{t('verifying')}</p>
  if (state === 'success') return <p>{t('success')}</p>
  if (state === 'resent') return <p>{t('resendSent')}</p>

  return (
    <div className="space-y-4">
      <p className="text-red-700">{t('tokenExpired')}</p>
      {email && (
        <button
          onClick={resend}
          className="bg-brand-green text-brand-cream font-semibold rounded-lg px-4 py-2 hover:bg-brand-green-deep"
        >
          {t('resendLink')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

With the dev server running, paste the verification link logged in Task 10's console (e.g. `http://localhost:3000/cs/overeni-emailu/<token>?email=test1%40example.com`) into the browser. Verify:
- "Ověřujeme váš e-mail…" briefly appears.
- Browser redirects to `/cs/prihlaseni?status=verified` with the green banner.
- Logging in with the freshly-verified user now succeeds.
- In Payload admin the user's `_verified` is now `true`.

Then test the expired-token path:
- Navigate manually to `/cs/overeni-emailu/clearly-invalid-token?email=test1%40example.com`.
- "Odkaz vypršel nebo je neplatný" renders with a "Poslat nový odkaz" button.
- Click it → "Pokud k tomuto e-mailu existuje účet, poslali jsme nový odkaz." (And the dev server console logs a second verification email if the user is still unverified — for this case the user is verified so nothing logs; that's fine per anti-enumeration.)

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/overeni-emailu/ src/components/auth/VerifyEmailClient.tsx
git commit -m "feat(auth): add email verification page with auto-verify and resend"
```

---

## Task 12: Forgot password page + form

**Files:**
- Create: `src/app/(frontend)/[locale]/zapomenute-heslo/page.tsx`
- Create: `src/components/auth/ForgotPasswordForm.tsx`

- [ ] **Step 1: Create the page**

`src/app/(frontend)/[locale]/zapomenute-heslo/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user) {
    redirect({ href: '/ucet', locale })
  }
  const t = await getTranslations({ locale, namespace: 'auth.forgot' })
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="text-text-secondary mb-6">{t('intro')}</p>
      <ForgotPasswordForm />
    </div>
  )
}
```

- [ ] **Step 2: Create the form**

`src/components/auth/ForgotPasswordForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/users/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">
        {t('successBody')}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">{t('email')}</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60"
      >
        {t('submit')}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Manual verification**

Visit `/cs/zapomenute-heslo`. Verify:
- With existing user's email → success message renders; dev server logs a reset email with link `…/cs/obnova-hesla/<token>`.
- With non-existent email → identical success message; dev server logs nothing.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/zapomenute-heslo/ src/components/auth/ForgotPasswordForm.tsx
git commit -m "feat(auth): add forgot-password page and form (anti-enumeration)"
```

---

## Task 13: Reset password page + form

**Files:**
- Create: `src/app/(frontend)/[locale]/obnova-hesla/[token]/page.tsx`
- Create: `src/components/auth/ResetPasswordForm.tsx`

- [ ] **Step 1: Create the page**

`src/app/(frontend)/[locale]/obnova-hesla/[token]/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

type Props = { params: Promise<{ locale: 'cs' | 'en'; token: string }> }

export default async function ResetPasswordPage({ params }: Props) {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'auth.reset' })
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <ResetPasswordForm token={token} />
    </div>
  )
}
```

- [ ] **Step 2: Create the form**

`src/components/auth/ResetPasswordForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { mapPayloadError } from '@/lib/auth/errors'

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth.reset')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)

    if (password.length < 8) {
      setErrorKey('passwordTooShort')
      return
    }
    if (password !== confirm) {
      setErrorKey('passwordMismatch')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const key = mapPayloadError(res.status, body, 'reset')
        setErrorKey(key.replace(/^auth\.reset\.errors\./, ''))
        setSubmitting(false)
        return
      }
      router.push('/prihlaseni?status=reset-ok')
    } catch {
      setErrorKey('generic')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorKey && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">
          {t(`errors.${errorKey}`)}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">{t('password')}</label>
        <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="passwordConfirm" className="block text-sm font-medium mb-1">{t('passwordConfirm')}</label>
        <input id="passwordConfirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
      </div>
      <button type="submit" disabled={submitting} className="w-full bg-brand-green text-brand-cream font-semibold rounded-lg py-2.5 hover:bg-brand-green-deep disabled:opacity-60">
        {t('submit')}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Manual verification**

Use the reset link logged in Task 12's console. Visit it and verify:
- Mismatched passwords → red error "Hesla se neshodují."
- Short password → red error "Heslo musí mít alespoň 8 znaků."
- Valid → redirects to `/cs/prihlaseni?status=reset-ok` with the green banner.
- Login with the new password works; old password is rejected.
- Reuse the same reset link → "Odkaz vypršel nebo je neplatný."

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/obnova-hesla/ src/components/auth/ResetPasswordForm.tsx
git commit -m "feat(auth): add reset-password page and form"
```

---

## Task 14: Account page (Server Component scaffold)

**Files:**
- Create: `src/app/(frontend)/[locale]/ucet/page.tsx`

- [ ] **Step 1: Create the page scaffold**

`src/app/(frontend)/[locale]/ucet/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { PersonalInfoForm } from '@/components/account/PersonalInfoForm'
import { AddressesManager } from '@/components/account/AddressesManager'
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm'
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function AccountPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect({ href: '/prihlaseni', locale })
  }

  const t = await getTranslations({ locale, namespace: 'account' })

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <PersonalInfoForm
        userId={user!.id}
        defaultValues={{
          firstName: user!.firstName ?? '',
          lastName: user!.lastName ?? '',
          phone: user!.phone ?? '',
        }}
      />
      <AddressesManager
        userId={user!.id}
        defaultAddresses={user!.addresses ?? []}
      />
      <ChangePasswordForm userEmail={user!.email} userId={user!.id} />
      <DeleteAccountSection userId={user!.id} userEmail={user!.email} />
    </div>
  )
}
```

This won't compile yet because the four `account/*` components don't exist. Create them in the next tasks. To unblock build-only checks now, create placeholder stubs:

```bash
mkdir -p src/components/account
```

Create each of these four stub files containing the named export only:

`src/components/account/PersonalInfoForm.tsx`:
```tsx
export function PersonalInfoForm(_: { userId: number; defaultValues: { firstName: string; lastName: string; phone: string } }) {
  return null
}
```

`src/components/account/AddressesManager.tsx`:
```tsx
import type { User } from '@/payload-types'
export function AddressesManager(_: { userId: number; defaultAddresses: NonNullable<User['addresses']> }) {
  return null
}
```

`src/components/account/ChangePasswordForm.tsx`:
```tsx
export function ChangePasswordForm(_: { userEmail: string; userId: number }) {
  return null
}
```

`src/components/account/DeleteAccountSection.tsx`:
```tsx
export function DeleteAccountSection(_: { userId: number; userEmail: string }) {
  return null
}
```

These will be replaced in the following tasks. The point is to get the page to build now so each subsequent task is a focused replacement.

- [ ] **Step 2: Manual verification**

```bash
docker-compose up -d
npm run dev
```

Visit `/cs/ucet`:
- Unauthenticated → redirects to `/cs/prihlaseni`.
- After login → page loads showing only the "Můj účet" heading (sections render nothing yet, as stubs).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/ucet/ src/components/account/
git commit -m "feat(account): add /ucet page scaffold with auth-gated redirect and section stubs"
```

---

## Task 15: PersonalInfoForm (full implementation)

**Files:**
- Modify: `src/components/account/PersonalInfoForm.tsx`

- [ ] **Step 1: Replace the stub with the real form**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Props = {
  userId: number
  defaultValues: { firstName: string; lastName: string; phone: string }
}

export function PersonalInfoForm({ userId, defaultValues }: Props) {
  const t = useTranslations('account.personal')
  const router = useRouter()
  const [values, setValues] = useState(defaultValues)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setErrorKey(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
      router.refresh()
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="personal-h2">
      <h2 id="personal-h2" className="text-xl font-semibold mb-4">{t('title')}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {success && (
          <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">{t('successSaved')}</div>
        )}
        {errorKey && (
          <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey)}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">{t('firstName')}</label>
            <input id="firstName" required value={values.firstName} onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1">{t('lastName')}</label>
            <input id="lastName" required value={values.lastName} onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">{t('phone')}</label>
          <input id="phone" type="tel" required value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <button type="submit" disabled={submitting} className="bg-brand-green text-brand-cream font-semibold rounded-lg px-5 py-2 hover:bg-brand-green-deep disabled:opacity-60">
          {t('save')}
        </button>
      </form>
    </section>
  )
}
```

- [ ] **Step 2: Manual verification**

Log in, visit `/cs/ucet`. Edit name + phone, save. Verify:
- Green success banner appears.
- Reload the page — values persisted (the Server Component re-reads the user).
- In Payload admin, the user record reflects the change.

- [ ] **Step 3: Commit**

```bash
git add src/components/account/PersonalInfoForm.tsx
git commit -m "feat(account): personal info form (name + phone)"
```

---

## Task 16: AddressesManager (full implementation)

**Files:**
- Modify: `src/components/account/AddressesManager.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@/payload-types'

type Address = NonNullable<User['addresses']>[number]

type Props = {
  userId: number
  defaultAddresses: NonNullable<User['addresses']>
}

const ZIP_RE = /^\d{3}\s?\d{2}$/

export function AddressesManager({ userId, defaultAddresses }: Props) {
  const t = useTranslations('account.addresses')
  const router = useRouter()
  const [rows, setRows] = useState<Address[]>(defaultAddresses)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  function update(i: number, patch: Partial<Address>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function add() {
    setRows((rs) => [...rs, { label: '', street: '', city: '', zip: '' }])
  }
  function remove(i: number) {
    if (!confirm(t('confirmRemove'))) return
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setErrorKey(null)
    for (const r of rows) {
      if (!r.street || !r.city || !ZIP_RE.test(r.zip)) {
        setErrorKey('errors.generic')
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addresses: rows }),
      })
      if (!res.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
      router.refresh()
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="addresses-h2">
      <h2 id="addresses-h2" className="text-xl font-semibold mb-4">{t('title')}</h2>
      <form onSubmit={save} className="space-y-6">
        {success && (
          <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">{t('successSaved')}</div>
        )}
        {errorKey && (
          <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey as 'errors.generic')}</div>
        )}
        {rows.length === 0 && <p className="text-text-secondary">{t('empty')}</p>}
        {rows.map((r, i) => (
          <fieldset key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="px-2 text-sm font-medium">{r.label || `#${i + 1}`}</legend>
            <div>
              <label className="block text-sm font-medium mb-1">{t('label')}</label>
              <input value={r.label ?? ''} onChange={(e) => update(i, { label: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('street')}</label>
              <input required value={r.street} onChange={(e) => update(i, { street: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('city')}</label>
                <input required value={r.city} onChange={(e) => update(i, { city: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('zip')}</label>
                <input required value={r.zip} onChange={(e) => update(i, { zip: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </div>
            </div>
            <button type="button" onClick={() => remove(i)} className="text-sm text-red-700 hover:underline">{t('remove')}</button>
          </fieldset>
        ))}
        <div className="flex gap-3">
          <button type="button" onClick={add} className="border border-brand-green text-brand-green font-semibold rounded-lg px-5 py-2 hover:bg-brand-green hover:text-brand-cream">
            {t('addRow')}
          </button>
          <button type="submit" disabled={submitting} className="bg-brand-green text-brand-cream font-semibold rounded-lg px-5 py-2 hover:bg-brand-green-deep disabled:opacity-60">
            {t('save')}
          </button>
        </div>
      </form>
    </section>
  )
}
```

- [ ] **Step 2: Manual verification**

On `/cs/ucet`:
- The user's default address (from signup) is listed.
- Click "Přidat adresu" → second row appears.
- Edit row 2 → fill street/city/ZIP → click "Uložit změny" → green banner.
- Reload → both addresses persisted.
- Click "Odstranit" on row 2 → confirm prompt → row removed → save → reload → only row 1 left.
- In Payload admin the user's `addresses` array reflects the changes.

- [ ] **Step 3: Commit**

```bash
git add src/components/account/AddressesManager.tsx
git commit -m "feat(account): addresses CRUD section"
```

---

## Task 17: ChangePasswordForm (full implementation, with current-password re-auth guard)

**Files:**
- Modify: `src/components/account/ChangePasswordForm.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Props = { userEmail: string; userId: number }

export function ChangePasswordForm({ userEmail, userId }: Props) {
  const t = useTranslations('account.password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)
    setSuccess(false)

    if (next.length < 8) {
      setErrorKey('errors.tooShort')
      return
    }
    if (next !== confirm) {
      setErrorKey('errors.mismatch')
      return
    }

    setSubmitting(true)
    try {
      // Re-authenticate to prove possession of the current password.
      // Payload's login also refreshes the cookie — no logout side effect.
      const reauth = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: userEmail, password: current }),
      })
      if (!reauth.ok) {
        setErrorKey('errors.currentWrong')
        setSubmitting(false)
        return
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: next }),
      })
      if (!res.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setSubmitting(false)
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="password-h2">
      <h2 id="password-h2" className="text-xl font-semibold mb-4">{t('title')}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {success && (
          <div role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3">{t('successSaved')}</div>
        )}
        {errorKey && (
          <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey as 'errors.currentWrong')}</div>
        )}
        <div>
          <label htmlFor="current" className="block text-sm font-medium mb-1">{t('current')}</label>
          <input id="current" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="new" className="block text-sm font-medium mb-1">{t('new')}</label>
            <input id="new" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium mb-1">{t('confirm')}</label>
            <input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="bg-brand-green text-brand-cream font-semibold rounded-lg px-5 py-2 hover:bg-brand-green-deep disabled:opacity-60">
          {t('save')}
        </button>
      </form>
    </section>
  )
}
```

- [ ] **Step 2: Manual verification**

On `/cs/ucet`:
- Wrong current password → red error "Současné heslo není správné."
- New password < 8 chars → "Heslo musí mít alespoň 8 znaků."
- Mismatched confirm → "Hesla se neshodují."
- Correct current + valid new → green "Heslo změněno."
- Log out, log back in with the **new** password → succeeds. Old password rejected.

- [ ] **Step 3: Commit**

```bash
git add src/components/account/ChangePasswordForm.tsx
git commit -m "feat(account): change-password section with current-password re-auth"
```

---

## Task 18: DeleteAccountSection (full implementation)

**Files:**
- Modify: `src/components/account/DeleteAccountSection.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Props = { userId: number; userEmail: string }

export function DeleteAccountSection({ userId, userEmail }: Props) {
  const t = useTranslations('account.delete')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function onConfirm() {
    setErrorKey(null)
    if (typed.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setErrorKey('errors.emailMismatch')
      return
    }
    setSubmitting(true)
    try {
      const del = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!del.ok) {
        setErrorKey('errors.generic')
        setSubmitting(false)
        return
      }
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
      router.push('/')
      router.refresh()
    } catch {
      setErrorKey('errors.generic')
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="delete-h2">
      <h2 id="delete-h2" className="text-xl font-semibold text-red-700 mb-4">{t('title')}</h2>
      <p className="text-text-secondary mb-4">{t('warning')}</p>
      <button type="button" onClick={() => setOpen(true)} className="border border-red-700 text-red-700 font-semibold rounded-lg px-5 py-2 hover:bg-red-700 hover:text-white">
        {t('button')}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">{t('confirmModal.title')}</h3>
            <p>{t('confirmModal.body')}</p>
            {errorKey && (
              <div role="alert" className="rounded-lg bg-red-50 text-red-800 px-4 py-3">{t(errorKey as 'errors.emailMismatch')}</div>
            )}
            <input
              aria-label={t('confirmModal.typeEmailPrompt')}
              placeholder={t('confirmModal.typeEmailPrompt')}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setOpen(false); setTyped(''); setErrorKey(null) }} className="rounded-lg px-4 py-2">
                {t('confirmModal.cancel')}
              </button>
              <button type="button" disabled={submitting} onClick={onConfirm} className="bg-red-700 text-white font-semibold rounded-lg px-4 py-2 hover:bg-red-800 disabled:opacity-60">
                {t('confirmModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Manual verification**

Create a throwaway test user (signup + verify via the existing flows). Log in as them, visit `/cs/ucet`:
- Click "Smazat účet" → modal opens.
- Wrong email typed → red error.
- Correct email → button → modal closes, redirected to `/`.
- Header reflects logged-out state on the next nav (verified more fully in Task 20).
- Cookies: `payload-token` cleared.
- In Payload admin, the user no longer exists.

- [ ] **Step 3: Commit**

```bash
git add src/components/account/DeleteAccountSection.tsx
git commit -m "feat(account): delete-account section with type-email confirmation"
```

---

## Task 19: Header user menu + logout button (server-into-client composition)

**Files:**
- Create: `src/components/layout/HeaderUserMenu.tsx`
- Create: `src/components/layout/LogoutButton.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/(frontend)/[locale]/layout.tsx`

- [ ] **Step 1: Create the Server Component user menu**

`src/components/layout/HeaderUserMenu.tsx`:

```tsx
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import { LogoutButton } from './LogoutButton'

export async function HeaderUserMenu() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const t = await getTranslations('nav.auth')

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/prihlaseni" className="hover:text-brand-cream/70 transition-colors">
          {t('login')}
        </Link>
        <Link href="/registrace" className="hover:text-brand-cream/70 transition-colors">
          {t('register')}
        </Link>
      </div>
    )
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-sm hover:text-brand-cream/70">
        {user.firstName ?? user.email}
      </summary>
      <div className="absolute right-0 mt-2 bg-white text-text-primary rounded-lg shadow-lg p-2 min-w-44 z-50">
        <Link href="/ucet" className="block px-3 py-2 rounded hover:bg-surface text-sm">
          {t('account')}
        </Link>
        <LogoutButton label={t('logout')} />
      </div>
    </details>
  )
}
```

- [ ] **Step 2: Create the client logout button**

`src/components/layout/LogoutButton.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter()
  async function onClick() {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    router.push('/')
    router.refresh()
  }
  return (
    <button type="button" onClick={onClick} className="block w-full text-left px-3 py-2 rounded hover:bg-surface text-sm">
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Modify `Header.tsx` to accept a `userMenu` child slot**

Replace the contents of `src/components/layout/Header.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/routing'
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher'
import type { ReactNode } from 'react'

export function Header({ userMenu }: { userMenu?: ReactNode }) {
  const t = useTranslations('nav')

  return (
    <header className="sticky top-0 z-50 bg-brand-green/95 backdrop-blur text-brand-cream">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="Kurník & Šopa">
          <Image
            src="/logo-kurnik-sopa.svg"
            alt="Kurník & Šopa"
            width={140}
            height={64}
            priority
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/produkty" className="hover:text-brand-cream/70 transition-colors">{t('products')}</Link>
          <Link href="/akce" className="hover:text-brand-cream/70 transition-colors">{t('events')}</Link>
          <Link href="/o-nas" className="hover:text-brand-cream/70 transition-colors">{t('about')}</Link>
          <Link href="/kontakt" className="hover:text-brand-cream/70 transition-colors">{t('contact')}</Link>
          <Link href="/blog" className="hover:text-brand-cream/70 transition-colors">{t('blog')}</Link>
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {userMenu}
          <Link
            href="/kosik"
            className="bg-brand-cream text-brand-green-deep px-4 py-2 rounded-lg font-semibold hover:bg-brand-cream-dark transition-colors"
          >
            {t('cart')}
          </Link>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Modify `layout.tsx` to pass HeaderUserMenu as a child**

In `src/app/(frontend)/[locale]/layout.tsx`, add the import:

```ts
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu'
```

Replace the `<Header />` line with:

```tsx
<Header userMenu={<HeaderUserMenu />} />
```

- [ ] **Step 5: Manual verification**

`npm run dev`. Verify:
- Logged-out: header shows "Přihlásit se" and "Registrovat" links to the right of the locale switcher.
- Log in via `/cs/prihlaseni` → after redirect to `/ucet`, the header now shows the user's first name. Click it → disclosure opens with "Můj účet" and "Odhlásit se."
- Click "Odhlásit se" → page navigates to `/`, header returns to the logged-out state.
- Repeat on `/en` to confirm translations.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/\(frontend\)/\[locale\]/layout.tsx
git commit -m "feat(auth): header user menu (server-component) and logout button"
```

---

## Task 20: Security/authorization checks (manual)

**Files:** none expected; only fix the collection if any check fails.

- [ ] **Step 1: Run the security checklist (spec §9.3)**

Start the dev server. From a logged-in customer session, copy the `payload-token` cookie value (DevTools → Application). Open a second user (admin) in the admin to get their ID. Then run the following curl commands, substituting `<customer-cookie>`, `<customer-id>`, and `<admin-id>`:

```bash
# 6: customer cannot read/update another user
curl -s -i -X PATCH http://localhost:3000/api/users/<admin-id> \
  -H "Cookie: payload-token=<customer-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"hacked"}'
# Expected: 403 (or similar denial), admin record unchanged.

# 7: customer cannot self-elevate to admin
curl -s -X PATCH http://localhost:3000/api/users/<customer-id> \
  -H "Cookie: payload-token=<customer-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
# Then GET and confirm role is still "customer":
curl -s http://localhost:3000/api/users/<customer-id> \
  -H "Cookie: payload-token=<customer-cookie>" | python -m json.tool | grep '"role"'

# 8: customer cannot change own email
curl -s -X PATCH http://localhost:3000/api/users/<customer-id> \
  -H "Cookie: payload-token=<customer-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"email":"hijack@example.com"}'
# Then re-read and confirm email unchanged.

# 9: logged-out cannot read any user
curl -s -i http://localhost:3000/api/users/<customer-id>
# Expected: 403.
```

- [ ] **Step 2: If any check fails — fix in `src/collections/Users/index.ts`**

The most likely failure modes:
- Role field still mutable → re-check `access.update: adminFieldOnly` on the `role` field.
- Cross-user read works → re-check `access.read = isAdminOrSelf` returns a filter object, not a boolean.
- Anonymous GET on a user works → check Payload defaults; ensure no `access.read: () => true` accidentally left on.

If you change the collection, re-run `generate:types` and `migrate:create` (likely no migration is needed since access is in-config). Commit any fix as:

```bash
git add src/collections/Users/index.ts
git commit -m "fix(auth): tighten Users access for [specific gap]"
```

If everything passes, no commit needed for this task.

---

## Task 21: Seed legal-page stubs

**Files:**
- Modify: `src/seed.ts`

- [ ] **Step 1: Inspect the current seed and add two Pages entries**

Open `src/seed.ts` and find the section that creates `pages` records (or add one if none exists). Append two entries:

```ts
// Czech legal pages (placeholder content — real copy added later)
await payload.create({
  collection: 'pages',
  data: {
    title: 'Ochrana osobních údajů',
    slug: 'ochrana-osobnich-udaju',
    status: 'published',
    content: {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          { type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Připravujeme — placeholder pro účely vývoje.' }] },
        ],
      },
    },
  },
})

await payload.create({
  collection: 'pages',
  data: {
    title: 'Obchodní podmínky',
    slug: 'obchodni-podminky',
    status: 'published',
    content: {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          { type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Připravujeme — placeholder pro účely vývoje.' }] },
        ],
      },
    },
  },
})
```

Notes:
- The lexical-rich-text node shape uses `version` and `format` fields per the seed-fix commit `0cf5108` on `origin/main` — match the existing seed entries' structure exactly. If the existing seed uses a helper, use it instead.
- The `pages` collection uses `localized: true` on `title` and `content`; Payload's local API on `create` writes to the current `req.locale` (default `'cs'`). If localized fields are wanted in EN too, follow the existing seed's pattern for setting EN translations (typically an `update` call with `locale: 'en'`). Add EN translations only if the rest of the seed already does this for other pages — otherwise leave for later.

- [ ] **Step 2: Run the seed and verify**

```bash
docker-compose down -v && docker-compose up -d   # fresh DB
npx payload migrate
npm run seed
```

Then visit `/admin` → Pages collection. Confirm two new pages exist with status `published`.

- [ ] **Step 3: Commit**

```bash
git add src/seed.ts
git commit -m "feat(content): seed stub Pages for privacy and terms (legal links)"
```

---

## Task 22: Final automated checks + i18n sanity

**Files:** none expected.

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: clean compile, no TypeScript errors, no missing-translation runtime warnings in the build output.

- [ ] **Step 2: Type generation produces no diff**

```bash
npm run generate:types
git diff --exit-code src/payload-types.ts
```

Expected: exit code 0 (no diff). If a diff appears, commit it as `chore: regenerate payload-types`.

- [ ] **Step 3: Importmap is still in sync**

```bash
npm run generate:importmap
git diff --exit-code src/app/\(payload\)/admin/importMap.js
```

Expected: exit code 0. (No custom admin components were added in this plan, so this should be a no-op.)

- [ ] **Step 4: Migrations idempotent on a fresh DB**

```bash
docker-compose down -v && docker-compose up -d
npx payload migrate
```

Expected: all migrations apply cleanly with no errors.

- [ ] **Step 5: Manual smoke of the full auth journey on the fresh DB**

```bash
npm run seed
npm run dev
```

Run through spec §9.2 items 1–4 once more on `/cs` and once on `/en`. This is the final pre-PR sanity check.

- [ ] **Step 6: Commit any incidental changes**

If any regenerated files surfaced:

```bash
git add -A
git commit -m "chore(auth): regenerate types and importmap"
```

If nothing changed, skip the commit.

---

## Task 23: Run the full spec §9 verification checklist

This is not a code task — it's an end-to-end manual pass that captures the evidence we need before declaring the work complete. Walk through every item in `docs/superpowers/specs/2026-05-15-phase-3-user-accounts-design.md` §9 (sections 9.2 through 9.6) and check it off. The §9.1 automated checks were already covered by Task 22.

If anything fails, file the fix as its own commit (`fix(auth): ...`) and re-run the affected portion of the checklist.

---

## Post-plan handoff (not in this plan)

After all tasks complete:
1. Push branch: `git push -u origin feature/phase-3-user-accounts`.
2. Create PR via `gh pr create` — include the verification checklist (§9) in the PR description.
3. PR description must also surface the two prereqs flagged in the spec:
   - Resend domain verification for `kurniksopa.cz` (or use `EMAIL_FROM=onboarding@resend.dev` on preview).
   - Real legal copy for `/ochrana-osobnich-udaju` and `/obchodni-podminky` (currently placeholder stubs).
4. Document the three Vercel env vars in the PR description: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.
5. Spec §9.7 deployment verification must pass on the Vercel preview before promoting to production.
