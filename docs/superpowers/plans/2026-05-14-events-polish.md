# Events Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Phase 2 by removing CLAUDE.md violations on the Events surface — hardcoded strings, missing image rendering, raw `eventType` labels, hardcoded `cs-CZ` dates, and a hardcoded contact phone.

**Architecture:** Pure storefront polish. Two pages edited in place (`akce/page.tsx` list, `akce/[slug]/page.tsx` detail). One new helper (`lib/site-settings.ts`). i18n keys added to existing `messages/cs.json` and `en.json` under the `events` namespace. No new collection, no migration, no `generate:types`, no admin changes.

**Tech Stack:** Next.js 15 App Router (React Server Components), Payload Local API (`getPayload`), `next-intl` v3 (`getTranslations`, `getFormatter`), `next/image`, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-05-14-events-polish-design.md`

**Working directory:** All commands assume `cd repo` from the repo root (the Next.js app lives in `repo/`).

---

## Task 1: Add SiteSettings helper

**Files:**
- Create: `repo/src/lib/site-settings.ts`

- [ ] **Step 1: Write the helper**

Create `repo/src/lib/site-settings.ts` with:

```ts
import { getPayload } from '@/lib/payload'

export async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
}
```

- [ ] **Step 2: Build check**

Run: `cd repo && npm run build`
Expected: build completes with no TS errors. (The helper isn't called yet but must type-check.)

- [ ] **Step 3: Commit**

```bash
cd repo
git add src/lib/site-settings.ts
git commit -m "feat: add getSiteSettings helper for global access"
```

---

## Task 2: Add events i18n keys

**Files:**
- Modify: `repo/messages/cs.json` — add keys under `events`
- Modify: `repo/messages/en.json` — same keys, EN

- [ ] **Step 1: Edit `messages/cs.json`**

Find the existing `"events": { ... }` block (around line 52) and **replace** it with:

```json
  "events": {
    "title": "Akce na farmě",
    "upcoming": "Nadcházející",
    "past": "Proběhlé",
    "register": "Registrovat se",
    "full": "Obsazeno",
    "free": "Zdarma",
    "capacity": "Kapacita: {count} míst",
    "spotsLeft": "Zbývá {count} míst",
    "empty": "Momentálně nejsou naplánované žádné akce. Sledujte nás na sociálních sítích.",
    "backToList": "Zpět na akce",
    "when": "Kdy",
    "where": "Kde",
    "price": "Cena",
    "capacityLabel": "Kapacita",
    "capacityCount": "{count} míst",
    "spotsRemaining": "zbývá {count}",
    "registerBy": "Registrace do",
    "registerCta": "Registrovat se: {phone}",
    "whatsapp": "WhatsApp",
    "eventType": {
      "workshop": "Workshop",
      "conference": "Konference",
      "seasonal": "Sezónní akce",
      "other": "Jiné"
    }
  },
```

(Keep the trailing comma — there are sections after `events` in the file.)

- [ ] **Step 2: Edit `messages/en.json`**

Find the existing `"events": { ... }` block (around line 52) and **replace** it with:

```json
  "events": {
    "title": "Farm events",
    "upcoming": "Upcoming events",
    "past": "Past",
    "register": "Register",
    "full": "Full",
    "free": "Free",
    "capacity": "Capacity: {count} spots",
    "spotsLeft": "{count} spots left",
    "empty": "No events scheduled right now. Follow us on social media.",
    "backToList": "Back to events",
    "when": "When",
    "where": "Where",
    "price": "Price",
    "capacityLabel": "Capacity",
    "capacityCount": "{count} spots",
    "spotsRemaining": "{count} left",
    "registerBy": "Register by",
    "registerCta": "Register: {phone}",
    "whatsapp": "WhatsApp",
    "eventType": {
      "workshop": "Workshop",
      "conference": "Conference",
      "seasonal": "Seasonal event",
      "other": "Other"
    }
  },
```

- [ ] **Step 3: Verify JSON is valid**

Run:
```bash
cd repo
node -e "JSON.parse(require('fs').readFileSync('messages/cs.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('ok')"
```
Expected output: `ok`

- [ ] **Step 4: Commit**

```bash
cd repo
git add messages/cs.json messages/en.json
git commit -m "feat(events): add i18n keys for events polish"
```

---

## Task 3: Polish events list page

**Files:**
- Modify: `repo/src/app/(frontend)/[locale]/akce/page.tsx` — full rewrite

This task replaces the entire file. The diff would be larger than the rewrite, so the plan provides the new file in full.

- [ ] **Step 1: Rewrite `akce/page.tsx`**

Replace the contents of `repo/src/app/(frontend)/[locale]/akce/page.tsx` with:

```tsx
import Image from 'next/image'
import { getTranslations, getFormatter } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('events')
  const format = await getFormatter()
  const payload = await getPayload()

  const events = await payload.find({
    collection: 'events',
    where: {
      status: { in: ['upcoming', 'full'] },
    },
    sort: 'date',
    limit: 50,
    locale,
  })

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-4xl text-center mb-4">{t('title')}</h1>
        <p className="text-center text-text-secondary mb-12">{t('upcoming')}</p>

        {events.docs.length === 0 ? (
          <p className="text-center text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.docs.map((event) => {
              const eventDate = new Date(event.date)
              const spotsLeft =
                event.capacity && event.registeredCount != null
                  ? event.capacity - event.registeredCount
                  : null

              const firstImage =
                event.images?.[0]?.image && typeof event.images[0].image === 'object'
                  ? event.images[0].image
                  : null
              const imageUrl = getMediaUrl(firstImage)

              return (
                <Link
                  key={event.id}
                  href={{ pathname: '/akce/[slug]', params: { slug: event.slug } }}
                  className="group block bg-brand-cream text-brand-green-deep rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-brand-green-light relative">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={firstImage?.alt || event.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    {event.eventType && (
                      <span className="absolute top-3 left-3 bg-brand-green-deep text-brand-cream text-xs px-2 py-1 rounded-full">
                        {t(`eventType.${event.eventType}`)}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-brand-green font-semibold mb-1">
                      {format.dateTime(eventDate, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {event.startTime && ` · ${event.startTime}`}
                      {event.endTime && `–${event.endTime}`}
                    </div>
                    <h3 className="font-heading text-xl mb-2 group-hover:text-brand-green transition-colors">
                      {event.title}
                    </h3>
                    {event.location && (
                      <p className="text-brand-green-deep/75 text-sm mb-3">
                        {event.location}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {event.price === 0 ? t('free') : `${event.price} Kč`}
                      </span>
                      {event.status === 'full' ? (
                        <span className="text-xs bg-brand-green-deep text-brand-cream px-2 py-1 rounded-full">
                          {t('full')}
                        </span>
                      ) : spotsLeft !== null ? (
                        <span className="text-xs text-brand-green-deep/70">
                          {t('spotsLeft', { count: spotsLeft })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

Changes from the previous version:
- Added imports: `Image` from `next/image`, `getFormatter` from `next-intl/server`, `getMediaUrl` from `@/lib/media`.
- Empty-state copy now `t('empty')`.
- Card image area renders `<Image fill>` when `event.images[0].image` is a populated media doc; falls back to the empty colored `aspect-[16/9]` block (no "Foto" text).
- `eventType` chip uses `t(\`eventType.${event.eventType}\`)` instead of `capitalize`.
- Date uses `format.dateTime(...)` so it picks up the active locale (CS → `pondělí 15. dubna 2026`, EN → `Monday, April 15, 2026`).

- [ ] **Step 2: Build check**

Run: `cd repo && npm run build`
Expected: build completes with no TS errors. Watch specifically for: `Cannot find module 'next-intl/server'` (means version mismatch — package.json pins `^3.25.0`, getFormatter exists), `event.images` typing errors (means `payload-types.ts` needs regen — should not happen since collection unchanged).

- [ ] **Step 3: Manual dev check**

```bash
cd repo
docker-compose up -d
npm run dev
```

Visit each URL and confirm:
- `http://localhost:3000/cs/akce` — Czech copy, Czech-formatted dates, event-type chips read "Workshop"/"Konference"/etc.
- `http://localhost:3000/en/akce` — English copy, English-formatted dates, English event-type labels.
- If at least one event has an image: card shows the image, not a colored block.
- If an event has no image: colored `aspect-[16/9]` block, no "Foto" text.
- Empty state (no events in either locale): localized empty copy renders.

- [ ] **Step 4: Commit**

```bash
cd repo
git add src/app/\(frontend\)/\[locale\]/akce/page.tsx
git commit -m "feat(events): polish list page — i18n, images, locale-aware dates"
```

---

## Task 4: Polish events detail page

**Files:**
- Modify: `repo/src/app/(frontend)/[locale]/akce/[slug]/page.tsx` — full rewrite

- [ ] **Step 1: Rewrite `akce/[slug]/page.tsx`**

Replace the contents of `repo/src/app/(frontend)/[locale]/akce/[slug]/page.tsx` with:

```tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getTranslations, getFormatter } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { getSiteSettings } from '@/lib/site-settings'
import { Link } from '@/lib/i18n/routing'
import { getMediaUrl } from '@/lib/media'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

function normalizePhoneHref(phone: string): string {
  const stripped = phone.replace(/\s+/g, '')
  return stripped.startsWith('+') ? stripped : `+420${stripped}`
}

function normalizeWhatsAppHref(phone: string): string {
  // wa.me wants digits only, no `+`
  const stripped = phone.replace(/\s+/g, '').replace(/^\+/, '')
  return stripped.startsWith('420') ? stripped : `420${stripped}`
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations('events')
  const format = await getFormatter()
  const payload = await getPayload()

  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    locale: locale as 'cs' | 'en',
  })

  const event = result.docs[0]
  if (!event) notFound()

  const settings = await getSiteSettings()
  const phone = settings.contact?.phone || ''
  const whatsapp = settings.contact?.whatsapp || ''

  const eventDate = new Date(event.date)
  const spotsLeft =
    event.capacity && event.registeredCount != null
      ? event.capacity - event.registeredCount
      : null

  const images =
    event.images
      ?.map((entry) =>
        entry.image && typeof entry.image === 'object' ? entry.image : null
      )
      .filter((img): img is NonNullable<typeof img> => img !== null) ?? []
  const hero = images[0] ?? null
  const heroUrl = getMediaUrl(hero)
  const thumbs = images.slice(1)

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/akce"
          className="text-brand-green hover:underline mb-6 inline-block"
        >
          &larr; {t('backToList')}
        </Link>

        {heroUrl && hero && (
          <div className="relative aspect-[16/9] mb-6 rounded-xl overflow-hidden bg-brand-green-light">
            <Image
              src={heroUrl}
              alt={hero.alt || event.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              priority
              className="object-cover"
            />
          </div>
        )}

        {thumbs.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {thumbs.map((img, idx) => {
              const url = getMediaUrl(img)
              if (!url) return null
              return (
                <div
                  key={idx}
                  className="relative aspect-[4/3] w-32 flex-shrink-0 rounded-lg overflow-hidden bg-brand-green-light"
                >
                  <Image
                    src={url}
                    alt={img.alt || event.title}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              )
            })}
          </div>
        )}

        {event.eventType && (
          <span className="inline-block bg-brand-cream text-brand-green-deep text-xs px-3 py-1 rounded-full mb-4">
            {t(`eventType.${event.eventType}`)}
          </span>
        )}

        <h1 className="font-heading text-4xl mb-4">{event.title}</h1>

        <div className="bg-brand-cream text-brand-green-deep rounded-xl p-6 mb-8 space-y-3">
          <div className="flex items-start gap-3">
            <span className="font-medium w-24">{t('when')}:</span>
            <span>
              {format.dateTime(eventDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {event.startTime && `, ${event.startTime}`}
              {event.endTime && `–${event.endTime}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">{t('where')}:</span>
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="font-medium w-24">{t('price')}:</span>
            <span>{event.price === 0 ? t('free') : `${event.price} Kč`}</span>
          </div>
          {event.capacity && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">{t('capacityLabel')}:</span>
              <span>
                {t('capacityCount', { count: event.capacity })}
                {spotsLeft !== null && ` (${t('spotsRemaining', { count: spotsLeft })})`}
              </span>
            </div>
          )}
          {event.registrationDeadline && (
            <div className="flex items-start gap-3">
              <span className="font-medium w-24">{t('registerBy')}:</span>
              <span>
                {format.dateTime(new Date(event.registrationDeadline), {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {event.status !== 'full' && phone && (
          <div className="flex gap-3 mb-8 flex-wrap">
            <a
              href={`tel:${normalizePhoneHref(phone)}`}
              className="inline-block bg-brand-cream text-brand-green-deep font-semibold px-6 py-3 rounded-lg hover:bg-brand-cream-dark transition-colors"
            >
              {t('registerCta', { phone })}
            </a>
            {whatsapp && (
              <a
                href={`https://wa.me/${normalizeWhatsAppHref(whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-2 border-brand-cream text-brand-cream font-semibold px-6 py-3 rounded-lg hover:bg-brand-cream hover:text-brand-green-deep transition-colors"
              >
                {t('whatsapp')}
              </a>
            )}
          </div>
        )}

        {event.description && (
          <div className="prose prose-lg prose-invert max-w-none">
            <RichText data={event.description} />
          </div>
        )}
      </div>
    </div>
  )
}
```

Changes from the previous version:
- Added imports: `Image`, `getTranslations`/`getFormatter`, `getSiteSettings`, `getMediaUrl`.
- All visible labels now come from `t(...)`.
- Hero image renders above title when `event.images[0]` is a populated media doc.
- Thumbnail strip renders `event.images.slice(1)` when present.
- Phone and WhatsApp now come from `SiteSettings.contact.*`.
- `tel:` href normalized via `normalizePhoneHref` (strip whitespace, prefix `+420` if no leading `+`).
- `wa.me/...` href normalized via `normalizeWhatsAppHref` (digits only, leading `420`).
- WhatsApp button hidden when `settings.contact.whatsapp` is empty.
- Whole CTA block hidden when SiteSettings has no phone (failsafe — phone has a default so this shouldn't trigger).
- Date formatting via `format.dateTime(...)` for both event date and `registrationDeadline`.
- `eventType` chip uses localized label.

- [ ] **Step 2: Build check**

Run: `cd repo && npm run build`
Expected: build completes with no TS errors. If `settings.contact?.phone` complains, run `cd repo && npm run generate:types` and try again (the SiteSettings types should already exist; only needed if types are stale).

- [ ] **Step 3: Manual dev check**

With `npm run dev` running from Task 3:

For at least one event (create one in `/admin` if none exists, with multiple images, capacity, deadline, location):
- `http://localhost:3000/cs/akce/{slug}` and `/en/akce/{slug}`:
  - Back-link uses localized label.
  - Hero image renders above title.
  - Thumbnail strip renders only if ≥2 images.
  - All metadata rows have localized labels (`Kdy/When`, `Kde/Where`, `Cena/Price`, `Kapacita/Capacity`, `Registrace do/Register by`).
  - Date formats match locale.
  - eventType chip shows localized label.
  - "Register" button shows `Registrovat se: 774801667` (or whatever SiteSettings has) and `tel:+420774801667` on hover.
  - WhatsApp button visible only if SiteSettings has `contact.whatsapp` set. Set it in `/admin` → Site Settings to verify both states.
- Event with `status: 'full'`: CTA block hidden entirely.
- Event with no images: no image block at all (no placeholder).

- [ ] **Step 4: Commit**

```bash
cd repo
git add src/app/\(frontend\)/\[locale\]/akce/\[slug\]/page.tsx
git commit -m "feat(events): polish detail page — i18n, images, SiteSettings contact"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full build**

```bash
cd repo
npm run build
```
Expected: succeeds with no errors.

- [ ] **Step 2: Lint (if configured)**

```bash
cd repo
npm run lint 2>/dev/null || echo "no lint script"
```
If lint exists: must pass.

- [ ] **Step 3: Smoke check both locales**

With dev server running, visit:
- `/cs/akce` and `/en/akce`
- One event detail in each locale: `/cs/akce/{slug}` and `/en/akce/{slug}`

Confirm there is no hardcoded Czech in the EN locale, and no untranslated raw eventType values.

- [ ] **Step 4: Update phases memory**

After the user confirms Phase 2 is closed, update `/Users/janantl/.claude/projects/-Users-janantl-Work-KurnikSopa/memory/project_phases.md` to mark Phase 2 as DONE and Phase 3 as next.

---

## Out of scope (explicitly NOT in this plan)

Per the spec — these will surface again later:
- `registeredCount` auto-maintenance hook (CLAUDE.md claims this exists but doesn't — claim stays in place until the hook is built).
- JSON-LD `Event` schema.
- `generateMetadata` / `hreflang` alternates.
- Admin field grouping, conditional fields, validators.
- Status auto-transition to `past`.
- Past-events archive.
- Self-registration form.
- Migrating products surface from `<img>` to `next/image` (events does it right; products is the lagging one).
