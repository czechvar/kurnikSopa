# Cookie Consent + Google Tag Manager + Google Analytics — Design Spec

Date: 2026-05-19
Branch: `feature/cookie-consent-gtm-ga`

## Context

Before public launch on `kurnik-sopa.cz`, the storefront needs:

1. GDPR-compliant cookie consent (opt-in for non-essential cookies).
2. Google Tag Manager loaded under consent gates (so GA, ads pixels, etc. can be added/changed by the operator in the GTM UI without code deploys).
3. Google Analytics 4 tracked via GTM (no separate gtag.js wiring in code).

User preference: **orestbida's `vanilla-cookieconsent`** over Google's own
"Consent Mode without UI" / Funding Choices flow.

## Assumptions

User went to sleep before this was clarified. These are the assumptions; flagged
clearly so they can be overridden on review:

1. **Library**: `vanilla-cookieconsent@^3.1.0` (orestbida). MIT-licensed, no deps,
   ~17 KB gzipped. Active maintenance.
2. **Region**: EU/GDPR by default for all visitors. No geolocation-based shortcut —
   the banner always appears on first visit; mode `opt-in`. (The site's customer base
   is overwhelmingly CZ; adding geo-IP logic to skip the banner for non-EU would be
   premature.)
3. **GA loading path**: GA4 is loaded **only** through the GTM container, not via a
   separate `gtag.js` snippet. This matches the user's stated preference ("orestbida
   over google tag implementation, can add google analytics as well"). The operator
   configures the GA4 tag inside GTM. **Implication**: code only needs `GTM_ID`,
   not a separate `GA_ID`.
4. **GTM Consent Mode v2**: Defaults `denied`, updated on user action. GTM loads on
   every page so the operator can still receive cookieless pings if Google Consent
   Mode is configured server-side.
5. **Languages**: CZ default + EN, matching the rest of the site. Translations live
   in `messages/cs.json` + `messages/en.json` under a `cookieConsent` namespace
   (user preference: keep all UI copy together). The client component reads
   them via `useTranslations('cookieConsent')` and reshapes into the nested
   structure `vanilla-cookieconsent` expects at runtime.
6. **Categories**: `necessary` (always on), `functional`, `analytics`, `marketing`.
   Four categories matches GTM's consent mode v2 signals and is what the operator
   will most likely need.
7. **Preferences re-entry**: A "Cookies" link in the footer calls
   `CookieConsent.showPreferences()` so users can change their mind without finding
   the banner.
8. **Cookie policy page**: A new `/cs/cookies` + `/en/cookies` page is created
   with the real Czech copy the user provided (Zásady používání souborů cookie).
   EN gets a translated version of the same content. Markers like `[Jméno…]`,
   `[Doplňte datum]` remain — user fills before public launch.
9. **VOP scope add-on**: The user also provided real Czech VOP (Všeobecné
   obchodní podmínky) and asked to land it in the same PR — replaces the
   existing placeholder at `/cs/obchodni-podminky`. EN gets a short note that
   the Czech version is authoritative (legal terms are jurisdiction-bound).
9. **Branch name**: `feature/cookie-consent-gtm-ga` — branched off `main`.

## Architecture

### Components

```
src/components/cookies/
  CookieConsentClient.tsx     — 'use client', initializes cookieconsent + GTM consent update bridge
  CookieConsentScripts.tsx    — Server component: emits inline <script> that sets
                                window.dataLayer + gtag('consent','default') BEFORE GTM loads.
                                Also injects GTM <script>+<noscript> if NEXT_PUBLIC_GTM_ID is set.
  cookie-config.ts            — Pure config: categories + translations + onConsent/onChange
                                callbacks that call updateGTMConsent()
  cookie-categories.ts        — Pure: CategoryKey type, mapping to GTM consent params
src/components/layout/
  FooterCookiesLink.tsx       — 'use client', button that calls CookieConsent.showPreferences()
src/app/(frontend)/[locale]/cookies/
  page.tsx                    — placeholder cookie policy page
```

### Mounting

In `src/app/(frontend)/[locale]/layout.tsx`:

```tsx
<html>
  <head>
    <CookieConsentScripts />   {/* inline consent defaults + GTM loader */}
  </head>
  <body>
    ...
    <CookieConsentClient locale={locale} />
    {/* Footer's "Cookies" link calls showPreferences() */}
  </body>
</html>
```

`CookieConsentScripts` is a Server Component that renders a `<script>` with
the GTM consent-default snippet **statically**, so it parses before any other
JS — including before React hydrates. This is the canonical GTM Consent Mode
v2 pattern: defaults must be set before any `gtag()` call.

### Data flow

```
First visit:
  HTML loads
  → <script> in <head>: window.dataLayer=[], gtag('consent','default',{... 'denied'})
  → GTM container <script> loads (if GTM_ID set) — sees consent denied, fires
    cookieless pings only.
  → React hydrates, CookieConsentClient mounts, calls CookieConsent.run(config).
  → Banner shows. User clicks Accept-all / Reject-all / Manage preferences.
  → onConsent/onChange callback dispatches gtag('consent','update',{...}).
  → GTM reacts; if analytics granted, GA4 tag fires with proper consent.

Return visit (consent stored):
  HTML loads → same <head> script (but consent state will be restored by
  cookieconsent after init via onFirstConsent vs onConsent distinction).
  → CookieConsentClient.run() finds existing cookie, fires onConsent
    immediately → gtag('consent','update') matches stored choices → no banner.
```

### Category → GTM consent param map

| Cookieconsent category | GTM consent params updated to `granted` |
|------------------------|-----------------------------------------|
| `necessary` (always)   | `security_storage` (always granted)     |
| `functional`           | `functionality_storage`, `personalization_storage` |
| `analytics`            | `analytics_storage`                     |
| `marketing`            | `ad_storage`, `ad_user_data`, `ad_personalization` |

Anything not granted stays `denied`. `security_storage` is hard-coded to
`granted` per Google's spec — it's not a user-controllable category.

### Env vars

Added to `.env.example`:

```
# Google Tag Manager container ID (e.g. GTM-XXXXXX). Empty disables analytics entirely.
NEXT_PUBLIC_GTM_ID=
```

No `GA_ID` — GA4 lives inside the GTM container.

Behavior matrix:

| `NEXT_PUBLIC_GTM_ID` | Banner shown? | GTM loaded? |
|----------------------|---------------|-------------|
| empty / unset        | yes (so consent state still persists, no surprise on prod) | no |
| set                  | yes           | yes, with consent defaults denied |

Rendering the banner even without GTM keeps the UX consistent on previews
and lets the user QA the consent UI without a GTM container.

### Storefront UI touchpoints

- **Footer**: existing footer gets a "Cookies" / "Cookie nastavení" link that
  opens `CookieConsent.showPreferences()`. Existing legal links
  (Obchodní podmínky, Ochrana os. údajů) are untouched.
- **Cookie policy page**: New `/cs/cookies` route, rendered from a server
  component, content via `next-intl` keys (page content is short and stable
  enough to live in `messages/*.json` rather than Payload).

## Styling

`vanilla-cookieconsent` ships its own CSS. We import the default theme and
add a thin override file to align with site colors:

```css
/* src/components/cookies/cookieconsent-overrides.css */
:root {
  --cc-btn-primary-bg: var(--color-brand);
  --cc-btn-primary-hover-bg: var(--color-brand-dark);
  --cc-font-family: var(--font-parkinsans), system-ui, sans-serif;
}
```

Imported once in `CookieConsentClient.tsx`. Tailwind v4 is not used inside the
consent modal — the library renders into its own DOM tree and Tailwind
utilities won't be present anyway. Per [[tailwind-v4-cascade-layers]], any
CSS overrides need to land outside the Tailwind `@layer base` to win
specificity — these CSS custom properties don't conflict, so it's safe.

## i18n strings

Banner / preferences modal copy is structured (sections per category, with
title + description). Lives in `cookie-config.ts` keyed by locale, not in
`messages/*.json`. CZ + EN.

Footer link + cookie policy page copy is small and goes in
`messages/cs.json` and `messages/en.json` under a new `cookies` namespace.

## Error handling

- If `NEXT_PUBLIC_GTM_ID` is missing → log nothing, skip GTM injection, still
  show banner so consent state is collected for if/when GTM is added later.
- `vanilla-cookieconsent` writes its choice to a first-party cookie
  (`cc_cookie`); SSR-safe — initialization is `useEffect`-gated, so no
  hydration mismatch.
- If `CookieConsent.run()` throws (shouldn't, but) → swallow + `console.warn`
  in dev only. Don't surface to user (tracking is non-critical).

## Testing

Vitest unit tests (`tests/unit/cookies/`):

1. `category-mapping.test.ts` — `mapCategoriesToGtmConsent(['analytics'])`
   returns the right `granted`/`denied` shape.
2. `cookie-config.test.ts` — config has both `cs` and `en` translations,
   all 4 categories present, necessary is `readOnly: true`.
3. `cookie-config.test.ts` — onConsent + onChange callbacks call a mock
   `gtag` with the expected `consent`,`update` arguments.

Integration tests are skipped — the library is a third-party DOM widget;
testing its behavior is testing their tests. We test our pure-logic glue.

## Out of scope

- Server-side GTM (sGTM). The operator can move to sGTM later by pointing GTM
  at a custom domain; no code change needed here.
- Funding Choices / non-personalized ads fallback.
- Geo-IP region detection (banner always shown).
- Cookie scanner / per-cookie disclosure tables. The cookie policy page lists
  categories, not individual cookies.
- Analytics on the consent banner itself (we don't track which button users
  click on the consent modal).
- Migration of any old consent state — none exists.

## Risks

1. **GTM blocks LCP**: GTM script is ~70 KB. Loaded `async` after `<head>` so
   shouldn't block first paint, but it does add to TBT. Acceptable for an
   e-commerce site; if Core Web Vitals regress past CLAUDE.md targets
   (LCP < 2.5s) we can switch to GTM `defer` or move it lower.
2. **Consent Mode v2 default-deny means initial pageview lands with no
   analytics**: that's the whole point. Operator should understand this when
   reading GA reports.
3. **Cookieconsent CSS specificity**: library uses high specificity, but
   variables override fine. Verified pattern from docs.
4. **First-deploy on Vercel**: env var `NEXT_PUBLIC_GTM_ID` must be set on
   Vercel before redeploy. Per CLAUDE.md, env vars only take effect on new
   deployments. Documented in PR description.

## Open questions (for user to confirm on merge)

- The real GTM container ID (`GTM-XXXXXX`) needs to be set on Vercel before
  the feature does anything. Branch will work locally with an empty/dummy ID.
- Cookie policy page copy is placeholder Czech. User will replace before
  public launch alongside obchodní podmínky / ochrana os. údajů.
