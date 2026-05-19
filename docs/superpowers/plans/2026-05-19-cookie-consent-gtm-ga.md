# Implementation Plan — Cookie Consent + GTM + GA

Spec: `docs/superpowers/specs/2026-05-19-cookie-consent-gtm-ga-design.md`
Branch: `feature/cookie-consent-gtm-ga`

User-confirmed decisions (2026-05-19):
- GA via GTM container only — one env var, `NEXT_PUBLIC_GTM_ID`.
- Banner copy in `messages/cs.json` + `messages/en.json` under `cookieConsent` namespace.
- Cookie policy: real Czech text provided, rendered at `/cs/cookies`.
- Bonus: replace `/cs/obchodni-podminky` placeholder with real VOP in same PR.

## Step 1 — Branch + dependency

- `git checkout -b feature/cookie-consent-gtm-ga`
- `npm install vanilla-cookieconsent@^3.1.0`
- commit: `chore(deps): add vanilla-cookieconsent for consent UI`

## Step 2 — Env + types

- `.env.example`: add `NEXT_PUBLIC_GTM_ID=` with comment.
- `src/types/gtm.d.ts`: augment `Window` with `dataLayer: unknown[]` +
  `gtag(...args: unknown[]): void`.

## Step 3 — Pure consent-mapping logic

- `src/components/cookies/cookie-categories.ts`:
  - `CategoryKey = 'necessary' | 'functional' | 'analytics' | 'marketing'`
  - `mapCategoriesToGtmConsent(granted: CategoryKey[]) → Record<string,'granted'|'denied'>`
    Always-granted: `security_storage`.
- `src/components/cookies/gtag.ts`:
  - `pushGtag(...args)` pushes onto `window.dataLayer` safely.

## Step 4 — Translations

- Add `cookieConsent` namespace to `messages/cs.json` + `messages/en.json`:
  - `consentModal.title`, `.description`, `.acceptAllBtn`, `.acceptNecessaryBtn`, `.showPreferencesBtn`, `.footer`
  - `preferencesModal.title`, `.acceptAllBtn`, `.acceptNecessaryBtn`, `.savePreferencesBtn`, `.closeIconLabel`
  - `categories.necessary.title|description`, same for functional/analytics/marketing
  - `manageButton` (footer link label)
- Add `cookies` namespace for the policy page: `pageTitle`, the full Czech text
  block, EN translation.
- Add `obchodniPodminky` namespace with real VOP text + EN summary.

## Step 5 — Cookie consent config builder

- `src/components/cookies/cookie-config.ts`:
  - `buildCookieConsentConfig({ locale, t, onCategoriesUpdate })` returns the
    `CookieConsent.run()` config:
    - `mode: 'opt-in'`
    - `categories: { necessary: { enabled: true, readOnly: true }, functional: {}, analytics: {}, marketing: {} }`
    - `language: { default: locale, translations: { [locale]: { consentModal, preferencesModal } } }`
    - `onConsent`/`onChange` call `onCategoriesUpdate` with the granted keys.

## Step 6 — Head scripts (Server Component)

- `src/components/cookies/CookieConsentHeadScripts.tsx`:
  - reads `process.env.NEXT_PUBLIC_GTM_ID`
  - emits inline `<script>` element setting `window.dataLayer`, `gtag` shim,
    `gtag('consent','default',{...denied, wait_for_update:500})`
  - if GTM ID present: emits GTM async loader `<script>`.
- `src/components/cookies/CookieConsentBodyNoscript.tsx`:
  - emits `<noscript><iframe …gtm.js…></iframe></noscript>` if GTM ID set.

## Step 7 — Client component

- `src/components/cookies/CookieConsentClient.tsx` (`'use client'`):
  - imports `vanilla-cookieconsent` + its CSS
  - imports override CSS
  - on mount: `import('vanilla-cookieconsent').then(CC => CC.run(buildCookieConsentConfig(...)))`
  - passes `onCategoriesUpdate` that calls
    `pushGtag('consent','update', mapCategoriesToGtmConsent(granted))`.
  - exposes nothing to render (library mounts its own DOM).

## Step 8 — Override CSS

- `src/components/cookies/cookieconsent-overrides.css`:
  - CSS variables for brand-aligned colors, font.

## Step 9 — Mount in layout

- `src/app/(frontend)/[locale]/layout.tsx`:
  - `<head>`: `<CookieConsentHeadScripts />`
  - top of `<body>`: `<CookieConsentBodyNoscript />`
  - inside `<NextIntlClientProvider>` (near Toaster): `<CookieConsentClient locale={locale} />`

## Step 10 — Footer link

- `src/components/layout/FooterCookiesLink.tsx` (`'use client'`):
  - button that calls `CookieConsent.showPreferences()` (dynamic import).
- Wire it into existing `Footer.tsx` legal links section.

## Step 11 — Policy page

- Add `/cookies` to `src/lib/i18n/routing.ts` pathnames (cs+en both `/cookies`).
- `src/app/(frontend)/[locale]/cookies/page.tsx`:
  - Server component, reads `cookies` namespace via `getTranslations`.
  - Renders title + body. Markers (`[Jméno…]`, `[Doplňte datum]`) stay in CZ
    JSON for user to fill.
- Metadata via `generateMetadata`.

## Step 12 — VOP page

- `src/app/(frontend)/[locale]/obchodni-podminky/page.tsx`:
  - Replace placeholder with `obchodniPodminky` namespace content.
  - EN page renders Czech note + link back to CZ for legal authority.

## Step 13 — Tests

- `tests/unit/cookies/category-mapping.test.ts` — 4 cases as described.
- `tests/unit/cookies/cookie-config.test.ts` — translations present, structure
  valid, onConsent fires callback.

## Step 14 — Verify

- `npm run build` — clean
- `npm test` — green
- `tsc --noEmit` (in CI but also locally)
- Manual smoke on `npm run dev` if time allows.

## Step 15 — Commit + push + PR

- Conventional commits per step.
- Push branch.
- `gh pr create` against `main` with summary + link to spec/plan.
- Do not merge — user merges in the morning.
