# Phase 3 — User accounts (email + password slice)

**Date:** 2026-05-15
**Status:** Approved (design)
**Scope of this spec:** First slice of Phase 3 — account creation, email verification, login/logout, forgot/reset password, and a logged-in profile page where users edit personal info, manage addresses, change password, and delete their account.

**Explicitly out of scope:**
- Google OAuth (deferred to a follow-up spec — adds a custom Payload auth strategy on top of this work).
- Cart and add-to-cart UI.
- Order placement, checkout, payments.
- Order history view on the profile page (no orders to show yet).

## 1. Goals & non-goals

**Goals**
- A Czech-first registered-customer flow that works end-to-end on the deployed Vercel preview.
- All UI strings via `next-intl`; no hardcoded copy.
- Customers can only read/modify their own user record. No privilege escalation possible from the storefront.
- Email verification is enforced before login.
- Password reset works via emailed token link.
- Server Components stay the default; only forms and interactive widgets are `'use client'`.
- Payload's REST endpoints own the cookie/session lifecycle — no Server Actions or custom auth API for this slice.

**Non-goals**
- Social login (Google OAuth) — see the follow-up spec.
- Account merging, email change with re-verification, account recovery for forgotten emails.
- Two-factor auth.
- Newsletter opt-in / marketing consent (separate from GDPR consent on signup).
- Tests beyond the manual checklist in §9 — the repo has no test framework yet; introducing one is out of scope.

## 2. Architecture overview

Auth flows live entirely inside the existing single-repo Next 15 + Payload v3 setup. No new services. Routes added under `(frontend)/[locale]`. Forms POST directly to Payload's built-in REST endpoints — Payload sets the HTTP-only JWT session cookie. Server Components read the current user via `payload.auth({ headers: await headers() })`.

```
Browser ──fetch──▶ /api/users/login        (Payload sets `payload-token` cookie)
Browser ──nav──▶ /cs/ucet (Server Component)
                  └─ payload.auth({headers}) → current user → render or redirect
```

No new API routes other than one small custom endpoint to re-send a verification email (§5.4).

## 3. Routes

Added to `src/lib/i18n/routing.ts` under `pathnames`:

| Internal path | CZ slug | EN slug |
|---|---|---|
| `/registrace` | `/registrace` | `/register` |
| `/prihlaseni` | `/prihlaseni` | `/login` |
| `/zapomenute-heslo` | `/zapomenute-heslo` | `/forgot-password` |
| `/obnova-hesla/[token]` | `/obnova-hesla/[token]` | `/reset-password/[token]` |
| `/overeni-emailu/[token]` | `/overeni-emailu/[token]` | `/verify-email/[token]` |
| `/ucet` | `/ucet` | `/account` |

Folder structure under `src/app/(frontend)/[locale]/` uses the CZ slug names (per existing convention).

**Page-level redirects** (all in Server Components, via `next-intl`'s `redirect`):
- Guest-only pages (`/registrace`, `/prihlaseni`, `/zapomenute-heslo`, `/obnova-hesla/[token]`) → if logged in, redirect to `/ucet`.
- Auth-required pages (`/ucet`) → if logged out, redirect to `/prihlaseni`.
- `/overeni-emailu/[token]` is accessible to either state — verifying while logged in is fine.

No logout route/page; logout is a button in the header that POSTs `/api/users/logout`.

## 4. `Users` collection changes

`src/collections/Users/index.ts`:

```ts
auth: {
  verify: {
    generateEmailSubject: ({ req }) =>
      req.locale === 'en' ? 'Verify your email' : 'Ověřte svůj e-mail',
    generateEmailHTML: ({ req, token, user }) =>
      verifyEmailTemplate({ locale: req.locale, token, name: user.firstName }),
  },
  forgotPassword: {
    generateEmailSubject: ({ req }) =>
      req.locale === 'en' ? 'Reset your password' : 'Obnovení hesla',
    generateEmailHTML: ({ req, token, user }) =>
      forgotPasswordTemplate({ locale: req.locale, token, name: user.firstName }),
  },
},
```

`auth.verify` adds `_verified` and `_verificationToken` columns. Once enabled, Payload **rejects login when `_verified === false`** — this gives us the "block-until-verified" behavior without extra code.

**Access control:**

| Op | Rule |
|---|---|
| `create` | `() => true` — signup must be public |
| `read` | admin → all; user → only their own (`{ id: { equals: user.id } }`) |
| `update` | same as read |
| `delete` | same as read (lets users delete themselves) |

**Field-level locking** (set `access.update` returning `req.user?.role === 'admin'`):
- `role` — without this, a logged-in customer could PATCH themselves to admin.
- `email` — changing the email re-opens the verification question; out of scope for v1, admin-only.

**Field requirements:** schema stays permissive (`firstName`, `lastName`, `phone`, `addresses` optional in Payload) so admin can still create skeletal records. The signup form enforces presence client-side and via its POST body.

**Migration:** edit collection → `npm run generate:types` → `npx payload migrate:create` → `npx payload migrate` → commit types + migration together.

## 5. Pages and components

### 5.1 Auth pages (`src/app/(frontend)/[locale]/`)

Each `page.tsx` is a Server Component that resolves auth state and renders one client-side form component.

| Page | Form component | POST target | Success transition |
|---|---|---|---|
| `/registrace` | `<SignupForm/>` | `POST /api/users` | redirect to `/registrace?status=check-email` (same page renders "Check your inbox" panel based on the `status` query param) |
| `/prihlaseni` | `<LoginForm/>` | `POST /api/users/login` | `router.push('/ucet'); router.refresh()` |
| `/zapomenute-heslo` | `<ForgotPasswordForm/>` | `POST /api/users/forgot-password` | inline success message (always shown, regardless of whether email exists) |
| `/obnova-hesla/[token]` | `<ResetPasswordForm/>` | `POST /api/users/reset-password` | redirect to `/prihlaseni?status=reset-ok` |
| `/overeni-emailu/[token]` | `<VerifyEmailClient/>` | fires `POST /api/users/verify/:token` on mount | on success → `/prihlaseni?status=verified`; on 4xx → "Odkaz vypršel nebo je neplatný" with a "Resend" button that POSTs `/api/users/resend-verification` using the `email` query param from the link (§6) |

All form components live in `src/components/auth/` and are `'use client'`.

### 5.2 Profile page `/ucet`

`page.tsx` is a Server Component that:
1. Reads `payload.auth({ headers })`; redirects to `/prihlaseni` if no user.
2. Renders the user's data into four stacked client sections, mobile-first single column.

Components in `src/components/account/`:

- **`<PersonalInfoForm/>`** — firstName, lastName, phone. PATCH `/api/users/:id`.
- **`<AddressesManager/>`** — list rows from `user.addresses[]`. Buttons: "Přidat adresu", per-row "Upravit"/"Odstranit". On save, PATCHes the full `addresses` array. Remove uses a confirm modal.
- **`<ChangePasswordForm/>`** — fields: current, new, confirm. PATCH `/api/users/:id` with `{ password: <new> }` plus a separate `currentPassword` verification. Payload's update accepts a password change when the user is authenticated, but does *not* require the current password by default — we add a small client-side guard that re-authenticates via a `POST /api/users/login` (in a separate request) before PATCHing. If login fails, we surface "Současné heslo není správné." Reasoning: defense against an attacker who hijacks an unattended session changing the password.
- **`<DeleteAccountSection/>`** — danger zone. Button opens a confirm modal that requires typing the user's email to confirm. On confirm: `DELETE /api/users/:id` → `POST /api/users/logout` → `router.push('/')`.

### 5.3 Header user menu

Add `src/components/layout/HeaderUserMenu.tsx` (Server Component) and slot it into the existing `Header`.

- **Not logged in:** two `next-intl` `<Link/>`s — "Přihlásit se" → `/prihlaseni`, "Registrovat" → `/registrace`. Desktop: inline; mobile: inside the existing burger drawer.
- **Logged in:** user's first name + a `<details>`/`<summary>` disclosure menu. Items: "Můj účet" → `/ucet`, then `<LogoutButton/>` (client; POSTs `/api/users/logout`, then `router.refresh()` and `router.push('/')`).

Native `<details>` keeps the dependency surface zero and is accessible. Tailwind styling.

### 5.4 Custom endpoint: resend verification email

Payload doesn't expose a resend-verification endpoint. Add `src/collections/Users/endpoints/resendVerification.ts` registered in the collection's `endpoints` array:

```
POST /api/users/resend-verification
body: { email }
```

Behavior:
1. Always return `{ ok: true }` (anti-enumeration).
2. If a user exists with `_verified === false`, regenerate `_verificationToken` and re-trigger the verification email via Payload's email adapter using the same template as initial signup.

Roughly 30 lines. Used by `<VerifyEmailClient/>`'s expired-link state.

**Abuse:** rate limiting on this endpoint is deferred — adding a real rate limiter (per-IP or per-email) belongs in a follow-up that covers all auth endpoints uniformly. Mitigation in the meantime: only re-send when the user is in `_verified: false` state, which is a bounded set, and the underlying Resend account has its own send quota.

### 5.5 Validation

HTML5 attributes plus a per-form `validate()` helper:
- Email format: HTML5 `type="email"` + a regex backstop.
- Password: ≥ 8 chars (matches Payload default).
- Password confirm: equal to password.
- Czech ZIP: `^\d{3}\s?\d{2}$`.
- All required fields present.

All errors render via `next-intl` keys.

## 6. Email infrastructure

`payload.config.ts` adds:

```ts
import { resendAdapter } from '@payloadcms/email-resend'

email: process.env.RESEND_API_KEY
  ? resendAdapter({
      defaultFromAddress: process.env.EMAIL_FROM ?? 'info@kurniksopa.cz',
      defaultFromName: 'Kurník Šopa',
      apiKey: process.env.RESEND_API_KEY,
    })
  : undefined,
```

If `RESEND_API_KEY` is unset (local dev without a key), `email` is left undefined and Payload falls back to its default console-logging email handler — emails appear in the dev server logs instead of being sent.

**Link generator** (`src/lib/email/links.ts`):

```ts
export const buildAuthUrl = (
  locale: 'cs' | 'en',
  kind: 'verify' | 'reset',
  token: string,
  email?: string,
): string => {
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
  const slug = kind === 'verify'
    ? (locale === 'en' ? 'verify-email' : 'overeni-emailu')
    : (locale === 'en' ? 'reset-password' : 'obnova-hesla')
  const url = `${base}/${locale}/${slug}/${token}`
  return email ? `${url}?email=${encodeURIComponent(email)}` : url
}
```

The verification link includes `?email=` so that when the token is expired, `<VerifyEmailClient/>` already knows which address to re-send to (see §5.1).

**Templates** (`src/lib/email/templates.ts`): inline TS template literals — one `verifyEmailTemplate({locale, token, name})` and one `forgotPasswordTemplate({locale, token, name})`. Plain HTML, brand color, logo URL pointing at R2, footer with contact details. If templates grow, migrate to React Email later. YAGNI for now.

**Resend domain prereq:** verify `kurniksopa.cz` in Resend (SPF + DKIM DNS records) before promoting to production. Until verified, `EMAIL_FROM=onboarding@resend.dev` on Vercel preview environments. Flagged in the PR description, not blocking the code.

## 7. i18n strings

Added to `messages/cs.json` and `messages/en.json` under these namespaces:

```
auth.signup.{title, fields.*, submit, agreement,
             errors.{emailTaken, emailInvalid, passwordTooShort, passwordMismatch, zipInvalid, required, generic},
             success.{checkEmailTitle, checkEmailBody}}
auth.login.{title, email, password, submit, forgotLink, registerLink,
            errors.{invalidCredentials, notVerified, generic}}
auth.forgot.{title, email, submit, successBody}
auth.reset.{title, password, passwordConfirm, submit,
            errors.{tokenExpired, generic}}
auth.verify.{verifying, success, tokenExpired, resendLink}
account.personal.{title, firstName, lastName, phone, save,
                  successSaved, errors.*}
account.addresses.{title, addRow, label, street, city, zip,
                   save, remove, confirmRemove}
account.password.{title, current, new, confirm, save,
                  errors.{currentWrong, tooShort, mismatch}}
account.delete.{title, warning, button,
                confirmModal.{title, body, typeEmailPrompt, confirm, cancel}}
nav.auth.{login, register, account, logout}
email.verify.{subject, bodyIntro, bodyButton, bodyFooter}
email.forgot.{subject, bodyIntro, bodyButton, bodyFooter}
```

**Anchor CZ strings** (full list lives in the JSON files; these set the tone):

| Key | CZ | EN |
|---|---|---|
| `nav.auth.login` | Přihlásit se | Log in |
| `nav.auth.register` | Registrovat | Sign up |
| `nav.auth.account` | Můj účet | My account |
| `nav.auth.logout` | Odhlásit se | Log out |
| `auth.signup.agreement` | Souhlasím se [zpracováním osobních údajů](/cs/ochrana-osobnich-udaju) a [obchodními podmínkami](/cs/obchodni-podminky). | I agree to the [privacy policy](/en/privacy) and [terms](/en/terms). |
| `auth.signup.success.checkEmailTitle` | Zkontrolujte svou schránku | Check your inbox |
| `auth.login.errors.notVerified` | E-mail dosud nebyl ověřen. Zkontrolujte svou schránku. | Email not yet verified. Check your inbox. |
| `auth.login.errors.invalidCredentials` | Špatný e-mail nebo heslo | Wrong email or password |
| `auth.verify.tokenExpired` | Odkaz vypršel nebo je neplatný | The link expired or is invalid |
| `account.delete.warning` | Tato akce je nevratná. Smaže se váš účet i historie objednávek. | This action is irreversible. Your account and order history will be deleted. |

**Error mapping** — small pure helper `src/lib/auth/errors.ts`:

```ts
mapPayloadError(status: number, body: unknown): string  // returns i18n key
```

Maps:
- 400 ValidationError on `email` with code `unique` → `auth.signup.errors.emailTaken`
- 401 from login → `auth.login.errors.invalidCredentials`
- 401 with body message containing "verified" → `auth.login.errors.notVerified`
- 400 on reset with body message containing "token" → `auth.reset.errors.tokenExpired`
- Anything else → `*.errors.generic`

**GDPR/legal prereq:** the signup checkbox links to `/cs/ochrana-osobnich-udaju` and `/cs/obchodni-podminky`. These `Pages` collection entries must exist before merging — if they don't yet, the PR stubs them as empty entries with placeholder content (CZ + EN). Flagged in the PR description.

## 8. Authorization summary (security checklist)

The collection access rules in §4 plus field-level locks must produce these properties:

- Anonymous user can `POST /api/users` (signup) and that's it.
- Customer A cannot read, update, or delete customer B's user record (403).
- Customer A *can* read/update/delete their own record.
- Customer attempting `PATCH /api/users/<self>` with `role: 'admin'` does **not** elevate (the `role` field's `access.update` denies).
- Customer attempting to change their `email` field via PATCH is denied (admin-only field).
- The `_verificationToken` and `resetPasswordToken` fields are not exposed via the REST read response.

All four must be verified manually (§9.3) before merge.

## 9. Verification plan

The repo has no test framework. Verification is manual against a checklist plus automated build/type/migration checks.

### 9.1 Automated (CI / pre-merge)
- `npm run build` — Next + Payload compile clean, no TS errors.
- `npx tsc --noEmit` if not implied by build.
- `npm run generate:types` leaves the working tree clean after the run.
- `npm run generate:importmap` — should be a no-op (no new admin components), rerun anyway.
- `npx payload migrate` applies cleanly on a fresh Docker DB.

### 9.2 Manual — auth flows
1. CZ: `/cs/registrace` → fill all fields + GDPR checkbox → submit → "Check your inbox" panel. Email arrives (or appears in console adapter logs locally).
2. Click verify link → land on `/cs/prihlaseni?status=verified` with green banner.
3. Attempt login before verifying a fresh account → "E-mail dosud nebyl ověřen…"
4. Login with verified account → redirect to `/cs/ucet`, header shows first name.
5. Repeat 1–4 on `/en` routes.

### 9.3 Manual — security checks (each must produce 403/no-op)
6. Logged in as customer A → `PATCH /api/users/<B_id>` → 403.
7. Logged in as customer → `PATCH /api/users/<self>` with `role: 'admin'` → on re-read, `role` is unchanged (Payload may return 200 with the field silently stripped, or 403 — either is acceptable; the invariant is that the role did not change).
8. Logged in as customer → `PATCH /api/users/<self>` with `email: 'new@x'` → on re-read, `email` is unchanged (same acceptance rule as item 7).
9. Logged-out `GET /api/users/<any>` → 403.

### 9.4 Manual — forgot/reset
10. `/cs/zapomenute-heslo` with existing email → success message; email arrives.
11. Same form with non-existent email → identical success message.
12. Reset link → set new password → land on `/cs/prihlaseni?status=reset-ok` → new password works, old fails.
13. Reuse the same reset link → "Odkaz vypršel."

### 9.5 Manual — profile
14. `/cs/ucet` unauthenticated → redirects to `/cs/prihlaseni`.
15. Edit name + phone, save → success indicator, header reflects new name on refresh.
16. Address CRUD — add 2, edit 1, remove 1 — persisted (verify in Payload admin).
17. Change password with wrong current → error. Correct current + valid new → success; re-login with new works.
18. Delete account → confirm modal (must type email) → account deleted, redirect home, session cleared.

### 9.6 Manual — accessibility & mobile
19. All forms keyboard-only navigable; labels associated with inputs; visible focus rings.
20. iPhone-sized viewport: forms render single column, no horizontal scroll, tap targets ≥ 44px.

### 9.7 Deployment verification
Items 1–4 and 14–18 must also pass on the Vercel preview URL using a real Resend send to a personal inbox before promoting to production.

## 10. Env vars

Added to `.env.example` and required on Vercel **Production** scope before deploy:

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend transactional email. If empty locally, Payload's console adapter logs the email body instead. |
| `EMAIL_FROM` | From-address. Use `onboarding@resend.dev` on preview until `kurniksopa.cz` is verified in Resend. |
| `NEXT_PUBLIC_SERVER_URL` | Base URL used in verification/reset links. Local: `http://localhost:3000`; Vercel: the deployment URL (or final domain once DNS lands). |

Per CLAUDE.md, **Vercel env var changes only apply on new deployments** — trigger a redeploy after adding these.

## 11. Deliverables

A single PR `feature/phase-3-user-accounts` containing:
- `src/collections/Users/index.ts` — auth.verify, auth.forgotPassword, access rules, field-level locks
- `src/collections/Users/endpoints/resendVerification.ts` — custom endpoint
- `src/lib/email/templates.ts`, `src/lib/email/links.ts`
- `src/lib/auth/errors.ts`
- `src/payload.config.ts` — Resend adapter registration
- `src/lib/i18n/routing.ts` — six new pathname entries
- `src/app/(frontend)/[locale]/{registrace,prihlaseni,zapomenute-heslo,obnova-hesla/[token],overeni-emailu/[token],ucet}/page.tsx`
- `src/components/auth/{SignupForm,LoginForm,ForgotPasswordForm,ResetPasswordForm,VerifyEmailClient}.tsx`
- `src/components/account/{PersonalInfoForm,AddressesManager,ChangePasswordForm,DeleteAccountSection}.tsx`
- `src/components/layout/HeaderUserMenu.tsx`, `src/components/layout/LogoutButton.tsx` (and Header wiring)
- `messages/cs.json`, `messages/en.json` — all new keys
- `src/migrations/<new>_user_auth.ts` — generated migration
- `src/payload-types.ts` — regenerated
- `.env.example` — three new vars

PR description includes: the Vercel preview-verification checklist (§9.7), the Resend domain-verification prereq (§6), and the legal pages prereq (§7).

## 12. Open follow-ups (not in this PR)

- Google OAuth — separate spec, builds a Payload custom auth strategy on top of this slice.
- Cart + add-to-cart UI.
- Order placement + checkout flow.
- Order history section on `/ucet` (becomes the fifth section once orders ship).
- Move email templates to React Email if/when they grow.
- Introduce a test framework (Vitest + Playwright likely) — independent decision, not blocked by this work.
