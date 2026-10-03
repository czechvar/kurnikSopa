# Tickets — Dev Environment Split + Farm Publishing

Derived from `docs/superpowers/specs/2026-09-12-dev-environment-split-and-farm-publishing-design.md`.

Two shipping units: **PR1 = T1 (environment)**, **PR2 = T2 (publishing)**.
Tickets marked **[manual]** happen in a dashboard, not in git, and are Jan's to do.

Sizes: S ≈ under an hour, M ≈ half a day, L ≈ a day or more.

**Filed on the Workstreams board (`kurnikSopa`, channel `QKLCFY`) on 2026-10-03.**
The board is the live state; this file is the original write-up. Task ids:

| Ticket | Workstreams task id |
|---|---|
| PR1 umbrella | `563e2e27-a3bd-4b57-8daf-99ca0d39d4dc` |
| T1-1 | `25055f8c-b1c8-45c0-a557-672f49831c10` |
| T1-2 | `518cd21e-20a1-4170-b949-456290732995` |
| T1-3 | `3b5b9dc5-60db-43f5-8a84-db63e777aed0` |
| T1-4 | `8f456c86-3e86-454d-8dde-89cd416f3cd6` |
| T1-5 | `a8183eab-9fc1-4b50-8b9c-42367e40668a` |
| T1-6 | `41811f11-43e6-486e-bc20-ee97e6f6f928` |
| T1-7 | `c69ebe1d-d5e4-40fb-a062-6c9fdb4d6882` |
| PR2 umbrella | `90f11cb1-716b-4682-951b-f783d7a2865b` |
| T2-1 | `294479ea-e92d-4834-b5dc-1e6c38c22559` |
| T2-2 | `732b87dc-479b-4176-b87c-0fe84a45c930` |
| T2-3 | `a928e74d-1119-4c50-a2f2-d077fd30b2e3` |
| T2-4 | `7e3f1f47-f9b1-4f56-b187-ad96b44889ca` |
| T2-5 | `b72d2d66-bbac-4f0b-98d7-d70710a4d48f` |
| T2-6 | `10998fd5-bd36-4ff0-aff7-0bc3a4fe9ca0` |
| T2-7 | `75d6e1eb-e448-4ee6-acd3-c45ecfff96ac` |
| T2-8 | `740b6a5c-7b4f-4b63-8af0-b36290a42b08` |
| T2-9 | `4075d2aa-ff60-4402-84e8-372ad27710a8` |
| T2-10 | `4b463c51-9f66-4f7b-aec4-86bf77c1c59e` |

---

## PR1 — Environment split

### T1-1 [manual] Create the Neon `dev` branch — S
Branch `dev` from `production` in the Neon console (Frankfurt project). Copy the
pooled connection string.

**Done when:** the branch exists, and `psql "<dev string>" -c 'select count(*) from posts'`
returns the same count as production.

**Blocks:** T1-2, T1-5.

---

### T1-2 [manual] Wire Vercel environment variables — S
- Preview scope: `DATABASE_URI` = Neon `dev` string, `NEXT_PUBLIC_SITE_URL` = `https://dev.kurnik-sopa.cz`.
- Preview scope, **scoped to branch `devel`**: `ENABLE_CLIENT_UPLOADS=true`.
- Production scope: `ENABLE_CLIENT_UPLOADS=true`; leave `DATABASE_URI` on production.

**Done when:** `vercel env ls` shows each var in the intended scope, and the
`devel` entry is branch-scoped rather than applying to all previews.

**Note:** Vercel env changes only take effect on new deployments.

**Depends on:** T1-1.

---

### T1-3 Create the `devel` branch and mirror branch protection — S
Branch `devel` from current `main`, push to origin. Mirror the
`require-tests-on-main` ruleset onto `devel` with the `test` check required.
Make `devel` the default base for new PRs.

**Done when:** `devel` exists on origin, a PR targeting it shows the required
`test` check, and `main` is untouched.

---

### T1-4 [manual] Repoint `dev.kurnik-sopa.cz` at `devel` — S
Vercel → Settings → Domains → `dev.kurnik-sopa.cz` → Git Branch = `devel`.

**Done when:** a commit pushed to `devel` redeploys `dev.kurnik-sopa.cz`, and a
commit to `main` does not.

**Depends on:** T1-2, T1-3.

---

### T1-5 [manual] Apply the R2 CORS policy — S
Cloudflare → R2 → `kurnik-sopa-media` → Settings → CORS Policy. Paste the JSON
from the spec (localhost:3000/3001, dev, apex, www; GET/PUT/POST/HEAD; expose ETag).

**Done when:** a browser PUT preflight from `https://dev.kurnik-sopa.cz` returns
the `Access-Control-Allow-Origin` header rather than failing.

---

### T1-6 Gate client uploads on an env var — S
`src/payload.config.ts`: `clientUploads: process.env.ENABLE_CLIENT_UPLOADS === 'true'`.
Add `ENABLE_CLIENT_UPLOADS` to `.env.example` with a comment
explaining the Vercel-cap reasoning. Add an "Environments" section to CLAUDE.md
documenting the branch/DB topology.

**Done when:** locally (var unset) an image upload in `/admin` succeeds through
the server path — this is the bug from `r2-cors-admin-uploads`, fixed.

**Depends on:** none for the code; T1-5 for the deployed half.

---

### T1-7 Verify the split end to end — S
On `dev.kurnik-sopa.cz`: upload a 6–10 MB phone photo in `/admin`, confirm it
lands in R2 and renders. Confirm the dev site reads the Neon `dev` branch (edit a
product title on dev, confirm production's DB is unchanged).

**Done when:** both hold, and the large-photo upload does not hit the 4.5 MB cap.

**Depends on:** T1-1 … T1-6. **This closes PR1.**

---

## PR2 — Publishing capability

### T2-1 Add the `editor` role — S
`Users.role` gains `editor`. Extend the `beforeChange` auto-verify hook to cover
it. Update `admin.hidden` across collections to the spec's visibility matrix
(Posts/Media/Authors/PostCategories visible to admin + editor; Orders/Carts to
admin + staff; everything else admin only).

**Done when:** an `editor` user logs into `/admin` and sees exactly four
collections; `generate:types` is re-run; migration for the enum change is
generated, hand-checked per `payload-migrate-required-columns`, and applied.

**Blocks:** T2-2, T2-10.

---

### T2-2 Harden access control on content collections — M
New `src/collections/access.ts` with `isAdmin`, `isAdminOrEditor`, `publicRead`.
Apply per the spec table: Posts/Authors/PostCategories/Media → public read,
`isAdminOrEditor` write; Products/ProductCategories/Events/Pages → public read,
`isAdmin` write.

**Related, already fixed 2026-09-12:** the same class of bug in `Users` let an
anonymous signup claim `role: admin`. Patched with a field-level `create` rule
plus `tests/integration/access-control/role-escalation.test.ts`, outside this
ticket.

**Why it matters:** today those collections fall back to Payload's default, so
any registered customer can create/update/delete products, posts and media
through `/api/*`. `admin.hidden` gates the UI only.

**Done when:** integration tests prove a `customer` gets 403 on create/update/
delete for each collection, an `editor` succeeds on the four content ones and is
refused on products/orders/users, and `staff` keeps its Phase 3b order access.

**Depends on:** T2-1.

---

### T2-3 Czech admin UI — S
`payload.config.ts` gains `i18n: { supportedLanguages: { cs, en }, fallbackLanguage: 'cs' }`.
Update the CLAUDE.md line that says to keep the admin English, and fix the
production domain in CLAUDE.md from `kurniksopa.cz` to `kurnik-sopa.cz`.

**Done when:** a fresh editor account sees a Czech admin, and Jan's account can
be switched back to English in account settings.

---

### T2-4 Move Posts to drafts/versions — M
`versions: { drafts: true }` on Posts, replacing the hand-rolled `status` select
with Payload's `_status`. Migration copies `status` → `_status` before dropping
the old column. Update all four read sites: blog list, blog detail fetcher,
`sitemap.ts`, and (later) the homepage teaser.

**Done when:** the existing post still renders on `/cs/blog`, version history
appears in the admin, and no code references the old `status` field on posts.

**Blocks:** T2-5, T2-6.

---

### T2-5 Preview before publishing — M
`admin.preview` on Posts producing `/api/preview?slug=…&locale=…`. Route
handler authenticates via the Payload admin session cookie (role admin or
editor), enables Next draft mode, redirects to the post. Blog detail drops the published-only filter and passes
`draft: true` **only** when draft mode is on.

**Done when:** an editor previews an unpublished post from the admin and sees it
rendered; the same URL with no admin session returns 401; the draft slug is a
404 in a browser without draft mode.

**Depends on:** T2-4.

---

### T2-6 Scheduled publishing — M
Shared helper `src/lib/posts/queries.ts` building the published-and-due filter
(`_status = published` AND `publishedAt <= now`), used by all four read sites.
`export const revalidate = 300` on blog list, blog detail and homepage.
`beforeChange` hook fills `publishedAt` with now on first publish when empty.

**Done when:** unit tests cover the filter (draft excluded, future excluded,
past included, exactly-now included) and the auto-fill hook; a post dated
tomorrow is absent from `/cs/blog` and from `sitemap.xml`.

**Depends on:** T2-4.

---

### T2-7 Restructure the Posts form — S
Three tabs — Obsah (title, slug, excerpt, content, coverImage), Zařazení
(author, categories), SEO (collapsed) — with `publishedAt` and the publish
control in the sidebar, and Czech field descriptions written for someone who has
never used a CMS.

**Done when:** the form renders in three tabs with no custom React components
(so no `generate:importmap` run is needed).

---

### T2-8 Homepage news teaser — M
`LatestPosts` server component: three most recent published-and-due posts below
the existing homepage sections — cover, title, date, excerpt, link. Renders
nothing when empty. Strings under `home.news` in `messages/cs.json` and `en.json`.

**Done when:** it appears on `/cs` and `/en` with the seeded post, and the
section disappears entirely when no posts are due.

**Depends on:** T2-6.

---

### T2-9 Blog images to `next/image` — S
Blog list and detail move from `<img>` to `next/image` with `fill` + `sizes`,
matching the events pages. Media URLs are Payload-relative, so
`images.remotePatterns` stays empty.

**Done when:** no `<img>` remains in the blog pages and CLS on `/cs/blog` is
unchanged or better.

---

### T2-10 Editor onboarding walkthrough — S
Create a real editor account on dev. Walk the whole path as that user: log in,
write a post in Czech, attach a cover photo, insert an in-body photo, preview,
schedule for tomorrow, then publish now. Note every point of confusion.

**Done when:** the walkthrough completes without admin help, and anything
confusing is either fixed or written into a short handover note for the farm.

**Depends on:** T2-1 … T2-9. **This closes PR2.**

---

## Not in these tickets

T3 (the Phase 1–3b verification checklist) gets its own document once PR2 lands.
Still parked: Balíkovna, Stripe, Google OAuth, abandoned-cart email, reorder
button, email-template polish, the `registeredCount` hook and other
events follow-ups, and the products `next/image` migration.
