# Dev Environment Split + Farm Publishing — Design

**Date:** 2026-09-12
**Status:** Approved for planning
**Tracks:** T1 (environment split), T2 (publishing capability)
**Follows:** Phase 4 partial (PRs #6–#9, May 2026)

## Context

The site has been idle since 2026-05-20. Phases 1–3b are shipped; Phase 4 is
partially done (tests, noindex, cookie consent, legal pages).

The agreed path to launch is:

1. Get everything Phase 1–3b verified working on `dev.kurnik-sopa.cz`.
2. Make the blog usable so the farm can publish their own news. **← T1 + T2, this spec**
3. Receive new design + real photographs from the client.
4. Cut `kurnik-sopa.cz` over to Vercel and go live.

Today `dev.kurnik-sopa.cz` *is* the production deployment: it tracks `main`,
and uses the production Neon database, the live Resend sender, and the R2
bucket. There is no environment where a schema change or a test order can be
tried safely.

Two hard blockers stop the farm from publishing at all:

- **Media uploads fail.** `clientUploads: true` (payload.config.ts:102) makes
  the browser PUT directly to R2, and the bucket has no CORS policy for any of
  our origins. No cover photos, no photos in article bodies.
- **Only `admin` can reach the blog.** `Posts`, `Media`, `Authors` and
  `PostCategories` all set `admin.hidden` for any non-admin role.

## Goals

- A `devel` branch deploying to `dev.kurnik-sopa.cz` against its own Neon
  database branch, so schema and content work is isolated from production.
- Working media uploads in every environment, including phone-sized photos.
- A non-technical Czech-speaking farm user who can log into `/admin`, write a
  news post, attach photos, preview it, and publish — and can reach nothing else.
- Content authored on dev survives the DNS cutover.

## Non-goals

- DNS cutover itself (step 4 — the procedure is documented here, not executed).
- Design changes beyond a minimal homepage news strip; the redesign is step 3.
- Payload Live Preview (side-by-side editing). A preview *link* is enough.
- Renaming `/blog` to `/aktuality`. Decided against.
- Two separate news surfaces. One `Posts` collection.
- Balíkovna, Stripe, Google OAuth, abandoned-cart — still Phase 4 candidates.

## T1 — Environment split

### Branch and deployment topology

```
devel  →  dev.kurnik-sopa.cz     →  Neon branch "dev"        (real content authored here)
main   →  kurnik-sopa.vercel.app →  Neon branch "production" (idle until cutover)
```

`devel` becomes the integration branch and the default base for feature
branches. `main` is reserved for the production cutover.

**Vercel configuration** (dashboard, manual):

- Settings → Domains → `dev.kurnik-sopa.cz` → Git Branch = `devel`.
- Environment variables: `DATABASE_URI` must differ per scope. The Neon dev
  branch connection string goes to the **Preview** scope (which is what a
  non-`main` branch deployment uses), the production string stays on
  **Production**. Same treatment for `NEXT_PUBLIC_SITE_URL`.
- The `require-tests-on-main` ruleset is mirrored onto `devel` with the `test`
  check required.

**Neon configuration** (dashboard, manual): create branch `dev` from
`production`. It starts as a copy-on-write copy, so existing products, events
and the one test post come along.

### Environment variable matrix

| Variable | Local | Preview (`devel`) | Production (`main`) |
|---|---|---|---|
| `DATABASE_URI` | docker localhost | Neon branch `dev` | Neon `production` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://dev.kurnik-sopa.cz` | `https://kurnik-sopa.cz` |
| `ENABLE_CLIENT_UPLOADS` | unset (server path) | `true`, **scoped to the `devel` branch** | `true` |
| `S3_*`, `RESEND_API_KEY`, `PAYLOAD_SECRET` | unchanged | unchanged | unchanged |

`ENABLE_CLIENT_UPLOADS` is set as a branch-scoped Preview variable so it applies
to `devel` (which serves `dev.kurnik-sopa.cz`, an origin the CORS policy covers)
but not to feature-branch previews, whose `*.vercel.app` URLs are unpredictable
and therefore cannot be in the policy. Those previews fall back to the
server-side upload path, which needs no CORS.

Every preview deployment, not just `devel`, reads the Neon `dev` branch. Feature
branches therefore share one database with the dev site — acceptable pre-launch,
and the reason a feature branch carrying a migration should be merged promptly
rather than left open.

Both environments share one R2 bucket and one Resend sender. Media is additive
and cheap to share; splitting it buys little and complicates the cutover.

**Consequence to accept:** transactional email from dev is real email. During
the T3 verification pass, `SiteSettings.notificationEmail` on the dev database
points at Jan's inbox, not the farm's.

### Media uploads

`clientUploads` becomes env-driven in `src/payload.config.ts`:

```ts
clientUploads: process.env.ENABLE_CLIENT_UPLOADS === 'true',
```

Deployed environments keep the direct browser → R2 path, which sidesteps
Vercel's ~4.5 MB function request body cap — the cap matters because phone
photos run 5–12 MB and the client is about to supply a batch of them. Local dev
and preview deployments with unpredictable URLs fall back to browser → Next → R2,
which needs no CORS entry.

**R2 CORS policy** (Cloudflare dashboard → R2 → `kurnik-sopa-media` → Settings
→ CORS Policy; applied by Jan):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://dev.kurnik-sopa.cz",
      "https://kurnik-sopa.cz",
      "https://www.kurnik-sopa.cz"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Cutover procedure (executed later, at step 4)

1. Merge `devel` → `main`.
2. Neon: promote branch `dev` to default, so the content the farm authored
   becomes production data.
3. Vercel: point `DATABASE_URI` (Production scope) at the promoted branch;
   set `NEXT_PUBLIC_SITE_URL=https://kurnik-sopa.cz`; add apex + `www` domains.
4. DNS: replace the legacy A record `185.66.36.184` with Vercel's records.
5. Redeploy production (Vercel env changes only take effect on new deployments).
6. Verify: `robots.ts` flips to `Allow` automatically on the apex hostname;
   check order-confirmation email links, and `hreflang` alternates.

Note for step 4: the legacy host currently answers HTTPS with a certificate for
`wh52.farma.gigaserver.cz` and a 403, so the apex is effectively HTTP-only
today. There is no working HTTPS state to preserve.

## T2 — Publishing capability

### Editor role

`Users.role` gains a fourth option, `editor`:

```ts
options: [
  { label: 'Admin', value: 'admin' },
  { label: 'Staff', value: 'staff' },
  { label: 'Editor', value: 'editor' },
  { label: 'Customer', value: 'customer' },
]
```

The existing `beforeChange` auto-verify hook in `src/collections/Users/index.ts`
extends to `editor`, so an editor created from the admin panel is not stuck
behind the customer email-verification flow.

Admin sidebar visibility by role:

| Collection | admin | staff | editor | customer |
|---|---|---|---|---|
| Posts, Media, Authors, PostCategories | ✓ | — | ✓ | — |
| Orders, Carts | ✓ | ✓ | — | — |
| Products, ProductCategories, Events, EventRegistrations, Pages, Users | ✓ | — | — | — |
| Globals (SiteSettings, Navigation, Footer) | ✓ | — | — | — |

Editors get Media because a post without a cover photo is not what the farm
wants. Media is a shared library, so an editor can see product photography —
acceptable; they cannot reach the Products collection that uses it.

### Access-control hardening

Found while scoping this work: `Posts`, `Media`, `Authors` and `PostCategories`
declare only `read`, and `Products`, `ProductCategories`, `Events` and `Pages`
declare no `access` block at all. Payload's default access grants every
operation to any authenticated user, so **any registered shop customer can
create, update or delete products, posts and media through `/api/*` today.**
`admin.hidden` hides the UI only; it does not gate the REST API.

**Fixed ahead of this spec (2026-09-12, during PR1 Task 1 verification):** a
worse variant in `Users`. Signup is public by design, and the `role` field
guarded only `update` — so an unauthenticated `POST /api/users` with
`"role": "admin"` created a real admin, which the auto-verify hook then marked
verified. Reproduced over HTTP against a throwaway database; never tested
against production, since that would mean creating an account there. The field
now uses `create: canSetRoleOnCreate`, which admits an admin, or anyone when the
users table is empty (Payload's create-first-user screen needs that). Covered by
`tests/integration/access-control/role-escalation.test.ts`.

Every content collection gets explicit access control:

```ts
// src/collections/access.ts (new, shared)
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
export const isAdminOrEditor: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'editor'
export const publicRead: Access = () => true
```

| Collection | read | create / update / delete |
|---|---|---|
| Posts, Authors, PostCategories, Media | public | `isAdminOrEditor` |
| Products, ProductCategories, Events, Pages | public | `isAdmin` |

Making `read` explicitly public on Products/Events/Pages is a behaviour change
for the REST API (today those require auth), but the storefront reads through
the Local API where access is overridden, so no frontend change follows. It
matches the intent: this is public catalogue content.

### Czech admin

`payload.config.ts` gains:

```ts
i18n: {
  supportedLanguages: { cs, en },   // from @payloadcms/translations/languages/*
  fallbackLanguage: 'cs',
}
```

Czech translations ship with Payload 3.84 — verified present in
`node_modules/@payloadcms/translations/dist/languages/cs.js`. Each user picks
their own language in admin account settings, so Jan can stay on English.

The CLAUDE.md line "Keep the admin panel English — it's internal" is updated:
it predates a non-technical external user having an account. The same edit
fixes the domain, which CLAUDE.md still writes as `kurniksopa.cz` instead of
the real `kurnik-sopa.cz`.

### Drafts, versions and preview

`Posts` gains `versions: { drafts: true }`, which replaces the hand-rolled
`status` select with Payload's own `_status` and gives version history and
rollback for free.

- Migration copies `status` → `_status`, then drops the `status` column.
  One post exists on dev, so the data risk is nil.
- Frontend queries change from `where: { status: { equals: 'published' } }` to
  `where: { _status: { equals: 'published' } }` in the blog list and detail
  fetchers.
- Preview: `admin.preview` on `Posts` returns `/api/preview?slug=…&locale=…`.
  A new route handler authenticates the caller with `payload.auth()` against the
  **admin session cookie**, requires role `admin` or `editor`, then calls Next's
  `draftMode().enable()` and redirects to `/{locale}/blog/{slug}`. The detail
  page checks `draftMode()` and, when enabled, drops the published-and-due
  filter and passes `draft: true`.

  A shared `PREVIEW_SECRET` was the first design; it was dropped because
  `admin.preview` is serialised into the admin's client bundle, so the secret
  would ship to the browser. The session cookie is already there, already
  scoped to the right people, and is one less variable to set at cutover. The
  gate still has to be enforced *before* draft mode is enabled — the Local API
  applies no access control of its own.

### Scheduled publishing

No cron. A post is scheduled by publishing it with `publishedAt` in the future;
read-time filtering hides it until then:

```ts
where: {
  _status: { equals: 'published' },
  publishedAt: { less_than_equal: new Date().toISOString() },
}
```

This lives in one shared helper (`src/lib/posts/queries.ts`) used by the blog
list, the blog detail fetcher, the homepage teaser and `sitemap.ts`, so the
four cannot drift apart.

Rendering must not be frozen at build time or a scheduled post never appears.
The blog list, blog detail and homepage get `export const revalidate = 300`.
Five minutes is fine granularity for farm news and keeps the Payload query off
the hot path for most requests.

`publishedAt` auto-fills with the current time on first publish if left empty,
via a `beforeChange` hook, so an author who ignores the sidebar still gets a
sensible date.

### Posts form restructure

The flat 10-field form becomes three tabs:

- **Obsah** — title, slug, excerpt, content, coverImage
- **Zařazení** — author, categories
- **SEO** — metaTitle, metaDescription, metaImage (collapsed by default)

with `publishedAt` and the publish control in the sidebar. Field descriptions
are written in Czech, addressed to someone who has never used a CMS. No custom
React components are involved, so `generate:importmap` is not needed.

### Homepage news teaser

A `LatestPosts` server component renders the three most recent published posts
below the existing sections on `/{locale}`: cover image, title, date, excerpt,
link. It renders nothing when there are no posts, so an empty blog never leaves
a hole on the homepage. Strings go in `messages/cs.json` / `messages/en.json`
under `home.news`.

This is deliberately plain. The designer will restyle it in step 3; the point
is to hand them something concrete rather than have them invent the surface.

### next/image on the blog

The blog list and detail pages still use raw `<img>`, violating CLAUDE.md's
"next/image everywhere". They move to `next/image` with `fill` + `sizes`,
matching the pattern already used on the events pages. Media URLs are
Payload-relative (`/api/media/file/…`), so `images.remotePatterns` stays empty
and no config change is needed.

In-body photos need no work: `UploadJSXConverter` is part of the default JSX
converter set and the detail query already uses `depth: 2`, so images inserted
in the editor render as a `<picture>` element inside `.prose`.

## Localization behaviour

`localization.fallback` is `true`, so a post written only in Czech displays its
Czech text on `/en/blog`. The farm writes once, in Czech. English translation
is optional and per-field, not a gate on publishing.

## Testing

Extends the existing Vitest suite (unit + integration projects).

**Integration** (`tests/integration/`):
- editor can create/update/delete a post, and cannot touch products, orders or users
- customer (authenticated, non-staff) cannot create or delete a post, product,
  or media — the regression test for the access hole found above
- staff retains order access and gains nothing on posts

**Unit** (`tests/unit/`):
- the published-posts query helper: excludes drafts, excludes a future
  `publishedAt`, includes a past one, includes one exactly at now
- `publishedAt` auto-fill hook: fills when empty on first publish, leaves an
  author-supplied value alone

CI already gates merges; the same workflow covers `devel` once the ruleset is
mirrored.

## Migrations

Two collection changes produce schema diffs: the `role` enum gains `editor`,
and `Posts` gains drafts/versions (`_status` column plus `_posts_v` version
tables). Per `payload-migrate-required-columns`, a generated migration adding a
`NOT NULL` column without a default must be hand-patched into the three-step
add-nullable → backfill → set-not-null form before running. The `status` →
`_status` copy is part of the same migration, executed before the old column is
dropped.

Migrations run against the Neon `dev` branch first, which is the point of T1
landing before T2.

## Risks

| Risk | Handling |
|---|---|
| R2 token lacks admin scope for CORS | Jan applies the policy in the dashboard; no script path needed |
| Preview route leaks drafts | Gated on the Payload admin session (role admin/editor), checked before draft mode is enabled; drafts stay 404 for everyone else |
| Editor deletes or replaces product photography from the Media library | Accepted; versions cover Posts, and R2 keeps the object. Revisit if it bites |
| Neon branch drifts from production before cutover | Production is idle by design. All work lands on `devel` |
| Cutover forgets a Vercel env var | The step-4 checklist above is executed as a list, not from memory |

## Sequencing

**PR 1 — T1 (environment):** `ENABLE_CLIENT_UPLOADS` gating, `.env.example`,
CLAUDE.md environment section. Paired with the manual Neon/Vercel/Cloudflare
steps. Verified by: an admin image upload succeeding on dev, and a
`devel`-deployed build reading the dev database.

**PR 2 — T2 (publishing):** editor role, access hardening, Czech admin, drafts
+ preview, scheduled publishing, Posts form, homepage teaser, next/image,
tests, migrations. Verified by: an editor account writing, previewing,
scheduling and publishing a post on dev with photos, and seeing nothing else.

**Then T3** — the Phase 1–3b verification checklist, which gets its own
document once these land.
