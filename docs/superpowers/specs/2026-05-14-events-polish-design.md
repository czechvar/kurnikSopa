# Phase 2 Events Polish — Design

**Date:** 2026-05-14
**Status:** Approved — ready for implementation plan
**Phase:** 2 (final task before closing)

## Goal

Close Phase 2 by removing CLAUDE.md violations on the Events surface. This is **polish only** — no new features, no admin changes, no hooks, no SEO additions. Bigger items (`registeredCount` hook, JSON-LD, `generateMetadata`/`hreflang`, admin field grouping, validators, status auto-transition, past-events archive) are explicitly deferred.

## Why This Scope

Phase 2 was wrapped on 2026-05-13 with blog + auto-slug shipped. The only remaining item was "Events polish — exact scope TBD." We picked the smallest scope that closes real bugs and CLAUDE.md violations so we can move on to Phase 3 (auth + ordering). The deferred items are real but none of them block Phase 2.

## Problems Being Fixed

In `repo/src/app/(frontend)/[locale]/akce/page.tsx` and `[slug]/page.tsx`:

1. **Hardcoded Czech strings.** `"Momentálně nejsou naplánované žádné akce…"`, `"Zpět na akce"`, `"Kdy/Kde/Cena/Kapacita/Registrace do:"`, `"zbývá"`, `"míst"`, `"Zdarma"`, `"Registrovat se:"`. CLAUDE.md forbids hardcoded strings.
2. **Images not rendered.** Collection has an `images` array but the list shows a literal `<span>Foto</span>` placeholder and detail page omits images entirely.
3. **`eventType` shown as raw value.** Rendered with CSS `capitalize` against the stored values (`"workshop"`, `"seasonal"`, etc.) — not the localized labels.
4. **Date locale hardcoded `cs-CZ`.** EN visitors see Czech-formatted dates.
5. **Hardcoded phone `+420 774 801 667`** on the detail page CTA. Should come from `SiteSettings.contact.phone` / `contact.whatsapp`.

## Out of Scope (deferred — not part of this work)

- `registeredCount` auto-maintenance hook. CLAUDE.md claims this is wired but it isn't. **CLAUDE.md will NOT be corrected in this work** — that fix belongs with the hook work. Noting it here so it isn't forgotten.
- JSON-LD `Event` schema.
- `generateMetadata` / `hreflang` alternates.
- Admin field grouping, conditional fields, validators (`deadline ≤ date`, `count ≤ capacity`).
- Status auto-transition to `past` after the event date.
- Past-events archive view.
- Self-registration form (firmly Phase 3 territory — needs cart-like flow + email).

## Files Touched

| File | Change |
|---|---|
| `repo/src/app/(frontend)/[locale]/akce/page.tsx` | List page — strings, images, eventType, date locale |
| `repo/src/app/(frontend)/[locale]/akce/[slug]/page.tsx` | Detail page — strings, hero+thumbs, SiteSettings phone/WhatsApp, eventType, date locale |
| `repo/src/messages/cs.json` | New keys under `events` |
| `repo/src/messages/en.json` | Same keys, EN |
| `repo/src/lib/site-settings.ts` *(new)* | `getSiteSettings()` helper wrapping `payload.findGlobal({ slug: 'site-settings' })` |

No new collections, no migration, no `generate:types` needed.

## i18n Keys Added

Under the existing `events` namespace in `messages/cs.json` and `messages/en.json`:

| Key | CS | EN |
|---|---|---|
| `empty` | "Momentálně nejsou naplánované žádné akce. Sledujte nás na sociálních sítích." | "No events scheduled right now. Follow us on social media." |
| `eventType.workshop` | "Workshop" | "Workshop" |
| `eventType.conference` | "Konference" | "Conference" |
| `eventType.seasonal` | "Sezónní akce" | "Seasonal event" |
| `eventType.other` | "Jiné" | "Other" |
| `backToList` | "Zpět na akce" | "Back to events" |
| `when` | "Kdy" | "When" |
| `where` | "Kde" | "Where" |
| `price` | "Cena" | "Price" |
| `capacityCount` | "{count} míst" | "{count} spots" |
| `spotsRemaining` | "zbývá {count}" | "{count} left" |
| `registerBy` | "Registrace do" | "Register by" |
| `registerCta` | "Registrovat se: {phone}" | "Register: {phone}" |
| `whatsapp` | "WhatsApp" | "WhatsApp" |

Existing keys (`title`, `upcoming`, `past`, `register`, `full`, `free`, `capacity`, `spotsLeft`) are reused where they apply.

## Date Formatting

Use `next-intl`'s server-side formatter rather than `toLocaleDateString('cs-CZ', …)`:

```ts
import { getFormatter } from 'next-intl/server'
const format = await getFormatter()
format.dateTime(new Date(event.date), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
```

CS → `pondělí 15. dubna 2026`. EN → `Monday, April 15, 2026`. Picks up the active locale automatically.

## Image Rendering

**List card** (`akce/page.tsx`):
- If `event.images?.[0]?.image` is a populated media doc with a `url`, render `next/image` with `fill` inside the existing `aspect-[16/9]` wrapper.
- Else: keep the `aspect-[16/9]` wrapper as a colored placeholder block but drop the "Foto" text. No localized label needed — the empty block is enough.

**Detail page** (`akce/[slug]/page.tsx`):
- Hero: `event.images[0]` rendered full-width with `next/image`, sensible `sizes`, above the title.
- Thumbnail strip: `event.images.slice(1)` rendered as a row of small `next/image`s below the hero. No lightbox, no JS, no client component.
- If `event.images` is empty/missing: skip the whole image block (no placeholder on detail).

Width/height: media docs from Payload include `width`/`height` — use them.

## SiteSettings Wiring

New helper `repo/src/lib/site-settings.ts`:

```ts
import { getPayload } from '@/lib/payload'

export async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
}
```

Detail page calls `getSiteSettings()` once and reads `contact.phone` and `contact.whatsapp`.

- Phone for `tel:` href: strip all whitespace from the stored value; if the result does not start with `+`, prefix `+420`. The current SiteSettings default is `"774801667"` (no country code), so this prepends `+420` → `tel:+420774801667`. Button label shows the SiteSettings value as-stored (admin formats it however).
- WhatsApp: if `contact.whatsapp` is empty/null, **hide the WhatsApp button entirely** (don't fall back to phone).

## Testing & Verification

No automated tests for storefront pages exist in this repo. Verification is manual:

1. `npm run build` runs clean (no TS errors, no missing-key warnings from next-intl).
2. Dev server check at `/cs/akce` and `/en/akce`:
   - Empty list state shows localized copy.
   - Cards render images when present, fall back gracefully when absent.
   - Dates formatted in active locale.
   - `eventType` chip shows localized label (not `"workshop"`).
3. Dev server check at `/cs/akce/{slug}` and `/en/akce/{slug}`:
   - All metadata rows use localized labels.
   - Hero image renders when present; thumbnails appear when ≥2 images.
   - Phone button uses value from SiteSettings; WhatsApp button hidden if `contact.whatsapp` blank.
   - Hides nothing it should show; shows nothing it should hide.

## Risks / Notes

- **`registeredCount` lie in CLAUDE.md stays in place.** Documented above. First task in the hook work should be to fix the doc too.
- **`getSiteSettings()` is fetched per detail-page render.** No caching layer added (RSC + Next.js caches the Payload Local API by default for the request lifecycle). If this becomes a hot path later, add `unstable_cache` or React `cache()` around it.
- **No fallback image on detail page** — empty `images` means no image block. Acceptable since admins are expected to add images; if this proves wrong in production, add a fallback later.

## Next Step

Invoke the `writing-plans` skill to turn this spec into a step-by-step implementation plan.
