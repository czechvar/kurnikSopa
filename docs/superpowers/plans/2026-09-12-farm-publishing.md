# Farm Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Commits:** Jan commits and opens PRs himself. Commit steps are written out, but confirm with him before running them.

**Goal:** A non-technical Czech-speaking farm user can log into `/admin`, write a news post with photos, preview it, schedule or publish it — and can reach nothing else.

**Architecture:** A new `editor` role, with explicit access control across every content collection (they currently fall back to Payload's "any authenticated user" default). `Posts` moves from a hand-rolled `status` select to Payload's drafts/versions, which gives preview and version history. Scheduling is read-time filtering on `publishedAt`, not a cron. One shared query helper serves all four public read sites so they cannot drift.

**Tech Stack:** Payload CMS 3.84 (drafts/versions, lexical, i18n), Next.js 15.4 (draft mode, ISR), Postgres enums, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-12-dev-environment-split-and-farm-publishing-design.md`
**Tickets:** T2-1 … T2-10 in `docs/superpowers/tickets/2026-09-12-dev-split-and-publishing-tickets.md`
**Prerequisite:** PR1 (`docs/superpowers/plans/2026-09-12-dev-environment-split.md`) merged, so migrations run against the Neon `dev` branch.

---

## File structure

| File | Responsibility |
|---|---|
| `src/collections/access.ts` (new) | Shared access predicates, the single source of truth for who may write content |
| `src/collections/Posts/index.ts` | Post schema: tabs, drafts, preview URL, hooks |
| `src/collections/Posts/hooks/fillPublishedAt.ts` (new) | Fill `publishedAt` on first publish |
| `src/lib/posts/queries.ts` (new) | The published-and-due `Where` clause, used by all four read sites |
| `src/app/api/preview/route.ts` (new) | Authenticates the previewer, enables Next draft mode |
| `src/components/blog/LatestPosts.tsx` (new) | Homepage news strip |

---

### Task 1: Add the `editor` role (T2-1)

**Files:**
- Modify: `src/collections/Users/index.ts` (role options ~line 87, auto-verify hook ~line 45)
- Modify: `tests/helpers/factories.ts` (role union ~line 13)
- Create: `tests/integration/access-control/editor-role.test.ts`
- Create: `src/migrations/<generated>_editor_role.ts`

- [ ] **Step 1: Widen the factory's role union**

In `tests/helpers/factories.ts`, change the `role` type in `createTestUser`'s overrides:

```ts
    role: 'admin' | 'staff' | 'editor' | 'customer'
```

- [ ] **Step 2: Write the failing test**

Create `tests/integration/access-control/editor-role.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('editor role', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('can be assigned to a user', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    expect(editor.role).toBe('editor')
  })

  // Editors are created by an admin, not through the customer signup flow, so
  // they must not be left behind an unverified-email wall (same reasoning as
  // the existing admin/staff bypass).
  it('is auto-verified on create, like admin and staff', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const fresh = await payload.findByID({
      collection: 'users',
      id: editor.id,
      showHiddenFields: true,
    })
    expect((fresh as any)._verified).toBe(true)
  })

  it('leaves customers unverified', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    const fresh = await payload.findByID({
      collection: 'users',
      id: customer.id,
      showHiddenFields: true,
    })
    expect((fresh as any)._verified).toBeFalsy()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run --project integration tests/integration/access-control/editor-role.test.ts`
Expected: FAIL — the `role` field rejects `'editor'` as an invalid option.

- [ ] **Step 4: Add the role option**

In `src/collections/Users/index.ts`, in the `role` field's `options` array, add between Staff and Customer:

```ts
        { label: 'Editor', value: 'editor' },
```

- [ ] **Step 5: Extend the auto-verify hook**

In the same file, in the `beforeChange` hook, replace the role condition:

```ts
        if (data.role === 'admin' || data.role === 'staff' || data.role === 'editor') {
          return { ...data, _verified: true }
        }
```

- [ ] **Step 6: Generate the migration**

Run: `npx payload migrate:create editor_role`

Open the generated `src/migrations/*_editor_role.ts` and confirm the `up` contains exactly this shape, matching the `staff` precedent in `src/migrations/20260517_060634_phase_3b_cart_orders.ts:6`:

```sql
ALTER TYPE "public"."enum_users_role" ADD VALUE 'editor' BEFORE 'customer';
```

If the generated file tries to *use* the new value in the same migration (an `UPDATE ... SET role = 'editor'`), remove that — Postgres cannot use an enum value added in the same transaction.

- [ ] **Step 7: Apply the migration and regenerate types**

Run: `npx payload migrate && npm run generate:types`
Expected: migration applies cleanly; `src/payload-types.ts` now includes `'editor'` in the role union.

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run --project integration tests/integration/access-control/editor-role.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Commit**

```bash
git add src/collections/Users/index.ts tests/helpers/factories.ts tests/integration/access-control/editor-role.test.ts src/migrations/
git commit -m "feat(users): add editor role with auto-verification"
```

---

### Task 2: Harden access control on content collections (T2-2)

`Posts`, `Media`, `Authors` and `PostCategories` declare only `read`. `Products`, `ProductCategories`, `Events` and `Pages` declare no `access` block at all. Payload's default grants every operation to any authenticated user, so **any registered shop customer can create, update or delete that content through `/api/*` today**. `admin.hidden` gates the UI only.

**Files:**
- Create: `src/collections/access.ts`
- Create: `tests/unit/collections/access.test.ts`
- Create: `tests/integration/access-control/content.test.ts`
- Modify: `src/collections/Posts/index.ts`, `src/collections/Authors/index.ts`, `src/collections/PostCategories/index.ts`, `src/collections/Media/index.ts`, `src/collections/Products/index.ts`, `src/collections/ProductCategories/index.ts`, `src/collections/Events/index.ts`, `src/collections/Pages/index.ts`

- [ ] **Step 1: Write the failing unit test for the predicates**

Create `tests/unit/collections/access.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isAdmin, isAdminOrEditor, publicRead } from '@/collections/access'

const req = (role?: string) => ({ req: { user: role ? { role } : null } }) as any

describe('access predicates', () => {
  it('isAdmin admits only admins', () => {
    expect(isAdmin(req('admin'))).toBe(true)
    expect(isAdmin(req('editor'))).toBe(false)
    expect(isAdmin(req('staff'))).toBe(false)
    expect(isAdmin(req('customer'))).toBe(false)
    expect(isAdmin(req())).toBe(false)
  })

  it('isAdminOrEditor admits admins and editors only', () => {
    expect(isAdminOrEditor(req('admin'))).toBe(true)
    expect(isAdminOrEditor(req('editor'))).toBe(true)
    expect(isAdminOrEditor(req('staff'))).toBe(false)
    expect(isAdminOrEditor(req('customer'))).toBe(false)
    expect(isAdminOrEditor(req())).toBe(false)
  })

  it('publicRead admits anonymous callers', () => {
    expect(publicRead(req())).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit tests/unit/collections/access.test.ts`
Expected: FAIL — cannot resolve `@/collections/access`.

- [ ] **Step 3: Write the predicates**

Create `src/collections/access.ts`:

```ts
import type { Access } from 'payload'

/** Admins only. Catalogue and site structure. */
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

/** Admins and editors. Editorial content the farm maintains itself. */
export const isAdminOrEditor: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'editor'

/**
 * Anyone, signed in or not. Explicit because Payload's default for an
 * unspecified operation is "any authenticated user", which is wrong in both
 * directions for public catalogue content.
 */
export const publicRead: Access = () => true
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project unit tests/unit/collections/access.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing integration test for the wiring**

Create `tests/integration/access-control/content.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

const postData = (slug: string) => ({ title: `Post ${slug}`, slug }) as any

describe('content collection access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a customer cannot create a post', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.create({
        collection: 'posts',
        locale: 'cs',
        data: postData('customer-post'),
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a customer cannot delete a post', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    const post = await payload.create({
      collection: 'posts',
      locale: 'cs',
      data: postData('victim'),
    })
    await expect(
      payload.delete({
        collection: 'posts',
        id: post.id,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a customer cannot create a product', async () => {
    const payload = await getTestPayload()
    const customer = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.create({
        collection: 'products',
        locale: 'cs',
        data: { name: 'Hacked', slug: 'hacked', price: 1, unit: 'ks' } as any,
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('an editor can create and delete a post', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const post = await payload.create({
      collection: 'posts',
      locale: 'cs',
      data: postData('editor-post'),
      user: editor,
      overrideAccess: false,
    })
    expect(post.slug).toBe('editor-post')
    await payload.delete({
      collection: 'posts',
      id: post.id,
      user: editor,
      overrideAccess: false,
    })
  })

  it('an editor can create an author and a post category', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    const author = await payload.create({
      collection: 'authors',
      locale: 'cs',
      data: { name: 'Farmář Jan', slug: 'farmar-jan' } as any,
      user: editor,
      overrideAccess: false,
    })
    expect(author.name).toBe('Farmář Jan')
    const category = await payload.create({
      collection: 'post-categories',
      locale: 'cs',
      data: { name: 'Novinky', slug: 'novinky' } as any,
      user: editor,
      overrideAccess: false,
    })
    expect(category.name).toBe('Novinky')
  })

  it('an editor cannot create a product', async () => {
    const payload = await getTestPayload()
    const editor = await createTestUser(payload, { role: 'editor' })
    await expect(
      payload.create({
        collection: 'products',
        locale: 'cs',
        data: { name: 'Nope', slug: 'nope', price: 1, unit: 'ks' } as any,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('staff gains no write access to posts', async () => {
    const payload = await getTestPayload()
    const staff = await createTestUser(payload, { role: 'staff' })
    await expect(
      payload.create({
        collection: 'posts',
        locale: 'cs',
        data: postData('staff-post'),
        user: staff,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('an anonymous caller can read posts', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'posts',
      locale: 'cs',
      data: postData('public-post'),
    })
    const result = await payload.find({
      collection: 'posts',
      overrideAccess: false,
    })
    expect(result.docs.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run --project integration tests/integration/access-control/content.test.ts`
Expected: FAIL — the customer and staff create/delete cases resolve instead of throwing. That failure *is* the vulnerability.

- [ ] **Step 7: Apply the predicates to the editorial collections**

In each of `src/collections/Posts/index.ts`, `src/collections/Authors/index.ts`, `src/collections/PostCategories/index.ts` and `src/collections/Media/index.ts`, add the import:

```ts
import { isAdminOrEditor, publicRead } from '../access'
```

and replace the `access` block with:

```ts
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
```

- [ ] **Step 8: Apply the predicates to the catalogue collections**

In each of `src/collections/Products/index.ts`, `src/collections/ProductCategories/index.ts`, `src/collections/Events/index.ts` and `src/collections/Pages/index.ts`, add the import:

```ts
import { isAdmin, publicRead } from '../access'
```

and add an `access` block directly after the `slug` property:

```ts
  access: {
    read: publicRead,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
```

- [ ] **Step 9: Update admin sidebar visibility**

In `src/collections/Posts/index.ts`, `src/collections/Authors/index.ts`, `src/collections/PostCategories/index.ts` and `src/collections/Media/index.ts`, replace the `admin.hidden` line with:

```ts
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
```

Leave `Orders` and `Carts` as they are (admin + staff), and leave every other collection admin-only.

- [ ] **Step 10: Run the test to verify it passes**

Run: `npx vitest run --project integration tests/integration/access-control/content.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 11: Verify nothing else regressed**

Run: `npx tsc --noEmit && npm test`
Expected: tsc silent, whole suite green — in particular the Phase 3b `orders.test.ts` and `carts.test.ts` access tests.

- [ ] **Step 12: Commit**

```bash
git add src/collections tests/unit/collections/access.test.ts tests/integration/access-control/content.test.ts
git commit -m "fix(access): require admin or editor to write content collections"
```

---

### Task 3: Czech admin UI (T2-3)

**Files:**
- Modify: `src/payload.config.ts`
- Modify: `/Users/janantl/Work/KurnikSopa/CLAUDE.md`

- [ ] **Step 1: Add the i18n config**

In `src/payload.config.ts`, add to the imports:

```ts
import { cs, en } from '@payloadcms/translations/languages/all'
```

and add a top-level key next to `localization`:

```ts
  i18n: {
    supportedLanguages: { cs, en },
    fallbackLanguage: 'cs',
  },
```

- [ ] **Step 2: Verify the admin renders in Czech**

Run: `npm run dev`, open `http://localhost:3000/admin`.
Expected: navigation and buttons in Czech ("Kolekce", "Uložit"). Your own account can be switched back to English under the account menu → Language.

If the import path fails, list what the package actually exports and adjust:
Run: `ls node_modules/@payloadcms/translations/dist/languages/ | head`
Expected: `cs.js` and `en.js` are present (verified 2026-09-12 on 3.84.1).

- [ ] **Step 3: Update the CLAUDE.md convention**

Replace the Payload convention line "Keep the admin panel English — it's internal." with:

```markdown
- Admin UI ships Czech + English (`i18n.supportedLanguages`), defaulting to
  Czech, because the farm's editor uses it directly. Each user can switch their
  own language in account settings.
```

- [ ] **Step 4: Commit**

```bash
git add src/payload.config.ts ../CLAUDE.md
git commit -m "feat(admin): add Czech admin UI with per-user language"
```

---

### Task 4: Move Posts to drafts and versions (T2-4)

Replaces the hand-rolled `status` select with Payload's `_status`, which is what unlocks preview and version history.

**Files:**
- Modify: `src/collections/Posts/index.ts`
- Modify: `src/app/(frontend)/[locale]/blog/page.tsx:17-22`
- Modify: `src/app/(frontend)/[locale]/blog/[slug]/page.tsx:16-25`
- Modify: `src/app/sitemap.ts:101-107`
- Create: `src/migrations/<generated>_posts_drafts.ts`

- [ ] **Step 1: Enable drafts and remove the custom status field**

In `src/collections/Posts/index.ts`, add after `slug: 'posts',`:

```ts
  versions: {
    drafts: true,
  },
```

and delete the whole `status` field object (the `select` with `Koncept`/`Publikováno` options at the end of `fields`).

- [ ] **Step 2: Generate the migration**

Run: `npx payload migrate:create posts_drafts`

- [ ] **Step 3: Hand-patch the migration**

Open the generated file. It will create the `_posts_v` version tables, add a `_status` column to `posts`, and drop the old `status` column. Two edits are required:

1. **Preserve the published flag.** Move the `DROP COLUMN "status"` statement so it runs *after* a copy, and insert the copy between the `ADD COLUMN "_status"` and the drop.

First read the enum type the new `_status` column uses:

```bash
grep -nE 'CREATE TYPE|ADD COLUMN "_status"' src/migrations/*_posts_drafts.ts
```

The existing custom field's type is `enum_posts_status` (created in `src/migrations/20260513_001033_add_blog_collections.ts:5`). Payload cannot reuse that name for its own column, so the generated file will declare something like `enum_posts_status_1` or `enum__posts_v_version_status`. Take the exact name from the `ADD COLUMN "_status"` line and substitute it here:

```sql
UPDATE "posts" SET "_status" = "status"::text::"enum_posts_status_1" WHERE "status" IS NOT NULL;
```

Casting through `text` is what lets one enum's values land in a differently-named enum.

2. **Backfill `published_at`.** Task 5 hides posts whose `publishedAt` is null or future, so any already-published post without a date would vanish:

```sql
UPDATE "posts" SET "published_at" = "created_at" WHERE "published_at" IS NULL AND "_status" = 'published';
```

Per the `payload-migrate-required-columns` memory: if any generated statement adds a `NOT NULL` column with no `DEFAULT`, split it into add-nullable → backfill → set-not-null before running.

- [ ] **Step 4: Apply the migration and regenerate types**

Run: `npx payload migrate && npm run generate:types`
Expected: applies cleanly. Verify the data survived:

```bash
psql "$DATABASE_URI" -c 'select slug, _status, published_at from posts;'
```

Expected: the existing post keeps its published state and has a non-null `published_at`.

- [ ] **Step 5: Update the three read sites**

`src/app/(frontend)/[locale]/blog/page.tsx` — in the `payload.find` call, replace:

```ts
    where: { status: { equals: 'published' } },
```

with:

```ts
    where: { _status: { equals: 'published' } },
```

`src/app/(frontend)/[locale]/blog/[slug]/page.tsx` — in `fetchPost`, replace the `where` with:

```ts
    where: {
      slug: { equals: slug },
      _status: { equals: 'published' },
    },
```

`src/app/sitemap.ts` — in the "Blog posts" query, replace:

```ts
    where: { status: { equals: 'published' } },
```

with:

```ts
    where: { _status: { equals: 'published' } },
```

Leave the products and events queries alone — those collections keep their own `status` fields.

- [ ] **Step 6: Verify no stale references remain**

Run: `grep -rn "status" src/app/\(frontend\)/\[locale\]/blog src/collections/Posts`
Expected: only `_status` occurrences.

- [ ] **Step 7: Verify the site and suite**

Run: `npx tsc --noEmit && npm test && npm run dev`
Expected: green; `http://localhost:3000/cs/blog` still lists the existing post, and the admin Posts edit view now shows a publish control plus version history.

- [ ] **Step 8: Confirm the test DB reset still cleans versions**

`tests/setup/reset-db.ts` truncates root tables with `CASCADE`, and `_posts_v` holds a foreign key to `posts`, so it should be cleaned automatically. Verify:

```bash
npx vitest run --project integration && psql "postgresql://kurnik:kurnik@localhost:5432/kurnik_sopa_test" -c 'select count(*) from _posts_v;'
```

Expected: `0`. If it is non-zero, add `'_posts_v'` to the `TABLES` array in `tests/setup/reset-db.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/collections/Posts src/app src/migrations src/payload-types.ts
git commit -m "feat(posts): move to Payload drafts and versions"
```

---

### Task 5: Published-and-due filtering (T2-6, part 1)

**Files:**
- Create: `src/lib/posts/queries.ts`
- Create: `tests/integration/posts/scheduled.test.ts`
- Modify: `tests/helpers/factories.ts`
- Modify: `src/app/(frontend)/[locale]/blog/page.tsx`, `src/app/(frontend)/[locale]/blog/[slug]/page.tsx`, `src/app/sitemap.ts`

- [ ] **Step 1: Add a post factory**

Append to `tests/helpers/factories.ts`:

```ts
let postCounter = 0

export async function createTestPost(
  payload: Payload,
  overrides: Partial<{
    title: string
    slug: string
    status: 'draft' | 'published'
    publishedAt: string | null
  }> = {},
) {
  postCounter += 1
  return payload.create({
    collection: 'posts',
    locale: 'cs',
    data: {
      title: overrides.title ?? `Test Post ${postCounter}`,
      slug: overrides.slug ?? `test-post-${postCounter}`,
      _status: overrides.status ?? 'published',
      publishedAt:
        overrides.publishedAt === undefined
          ? new Date('2026-01-01T00:00:00.000Z').toISOString()
          : overrides.publishedAt,
    } as any,
  })
}
```

Add `Post` to the type import at the top of the file if you want a typed return:

```ts
import type { Cart, Post, Product, User } from '@/payload-types'
```

- [ ] **Step 2: Write the failing test**

Create `tests/integration/posts/scheduled.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestPost } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import { publishedPostsWhere, publishedPostBySlugWhere } from '@/lib/posts/queries'

const NOW = new Date('2026-09-12T12:00:00.000Z')

describe('published-and-due post filtering', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('includes a post published in the past', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, {
      slug: 'past',
      publishedAt: '2026-09-01T00:00:00.000Z',
    })
    const result = await payload.find({
      collection: 'posts',
      where: publishedPostsWhere(NOW),
      locale: 'cs',
    })
    expect(result.docs.map((d) => d.slug)).toContain('past')
  })

  it('excludes a post scheduled for the future', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, {
      slug: 'future',
      publishedAt: '2026-12-24T00:00:00.000Z',
    })
    const result = await payload.find({
      collection: 'posts',
      where: publishedPostsWhere(NOW),
      locale: 'cs',
    })
    expect(result.docs.map((d) => d.slug)).not.toContain('future')
  })

  it('excludes a draft even when its date has passed', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, {
      slug: 'draft',
      status: 'draft',
      publishedAt: '2026-01-01T00:00:00.000Z',
    })
    const result = await payload.find({
      collection: 'posts',
      where: publishedPostsWhere(NOW),
      locale: 'cs',
    })
    expect(result.docs.map((d) => d.slug)).not.toContain('draft')
  })

  it('excludes a published post with no date at all', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, { slug: 'undated', publishedAt: null })
    const result = await payload.find({
      collection: 'posts',
      where: publishedPostsWhere(NOW),
      locale: 'cs',
    })
    expect(result.docs.map((d) => d.slug)).not.toContain('undated')
  })

  it('finds a single due post by slug', async () => {
    const payload = await getTestPayload()
    await createTestPost(payload, {
      slug: 'wanted',
      publishedAt: '2026-09-01T00:00:00.000Z',
    })
    await createTestPost(payload, {
      slug: 'unwanted',
      publishedAt: '2026-09-01T00:00:00.000Z',
    })
    const result = await payload.find({
      collection: 'posts',
      where: publishedPostBySlugWhere('wanted', NOW),
      locale: 'cs',
      limit: 1,
    })
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]?.slug).toBe('wanted')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run --project integration tests/integration/posts/scheduled.test.ts`
Expected: FAIL — cannot resolve `@/lib/posts/queries`.

- [ ] **Step 4: Write the query helper**

Create `src/lib/posts/queries.ts`:

```ts
import type { Where } from 'payload'

/**
 * Posts the public may see: published, and not scheduled for a future date.
 *
 * Scheduling is read-time only — there is no cron. A post with a future
 * publishedAt is already "published" in Payload's sense and simply stays hidden
 * until its date passes, which is why every public read site must use this
 * clause rather than filtering on _status alone.
 */
export function publishedPostsWhere(now: Date = new Date()): Where {
  return {
    and: [
      { _status: { equals: 'published' } },
      { publishedAt: { less_than_equal: now.toISOString() } },
    ],
  }
}

export function publishedPostBySlugWhere(slug: string, now: Date = new Date()): Where {
  return {
    and: [{ slug: { equals: slug } }, publishedPostsWhere(now)],
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run --project integration tests/integration/posts/scheduled.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Wire the blog list**

In `src/app/(frontend)/[locale]/blog/page.tsx`, add the import:

```ts
import { publishedPostsWhere } from '@/lib/posts/queries'
```

replace the `where` in the `payload.find` call with:

```ts
    where: publishedPostsWhere(),
```

and add at the top level of the module, below the imports:

```ts
// Scheduled posts become visible when their date passes, so this page cannot be
// frozen at build time.
export const revalidate = 300
```

- [ ] **Step 7: Wire the blog detail**

In `src/app/(frontend)/[locale]/blog/[slug]/page.tsx`, add the import:

```ts
import { publishedPostBySlugWhere } from '@/lib/posts/queries'
```

replace the `where` inside `fetchPost` with:

```ts
    where: publishedPostBySlugWhere(slug),
```

and add below the imports:

```ts
export const revalidate = 300
```

- [ ] **Step 8: Wire the sitemap**

In `src/app/sitemap.ts`, add the import:

```ts
import { publishedPostsWhere } from '@/lib/posts/queries'
```

and replace the blog posts query's `where` with:

```ts
    where: publishedPostsWhere(),
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: green.

- [ ] **Step 10: Commit**

```bash
git add src/lib/posts/queries.ts tests/integration/posts/scheduled.test.ts tests/helpers/factories.ts src/app
git commit -m "feat(posts): hide posts scheduled for the future"
```

---

### Task 6: Auto-fill publishedAt on first publish (T2-6, part 2)

Without this, an author who publishes without touching the sidebar date gets a post that Task 5 immediately hides.

**Files:**
- Create: `src/collections/Posts/hooks/fillPublishedAt.ts`
- Create: `tests/unit/posts/fill-published-at.test.ts`
- Modify: `src/collections/Posts/index.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/posts/fill-published-at.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fillPublishedAt } from '@/collections/Posts/hooks/fillPublishedAt'

const run = (data: Record<string, unknown>) =>
  fillPublishedAt({ data } as any) as Record<string, unknown>

describe('fillPublishedAt', () => {
  it('fills the date when publishing without one', () => {
    const result = run({ _status: 'published' })
    expect(typeof result.publishedAt).toBe('string')
    expect(Number.isNaN(Date.parse(result.publishedAt as string))).toBe(false)
  })

  it('leaves an author-supplied date alone, including a future one', () => {
    const scheduled = '2026-12-24T00:00:00.000Z'
    expect(run({ _status: 'published', publishedAt: scheduled }).publishedAt).toBe(scheduled)
  })

  it('does not date a draft', () => {
    expect(run({ _status: 'draft' }).publishedAt).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit tests/unit/posts/fill-published-at.test.ts`
Expected: FAIL — cannot resolve the hook module.

- [ ] **Step 3: Write the hook**

Create `src/collections/Posts/hooks/fillPublishedAt.ts`:

```ts
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * A post published with an empty date would be hidden by publishedPostsWhere,
 * which looks like "publishing did nothing". Fill it with now instead. An
 * author-supplied date — including a future one, which is how scheduling
 * works — is left untouched.
 */
export const fillPublishedAt: CollectionBeforeChangeHook = ({ data }) => {
  if (data._status === 'published' && !data.publishedAt) {
    return { ...data, publishedAt: new Date().toISOString() }
  }
  return data
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project unit tests/unit/posts/fill-published-at.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Register the hook**

In `src/collections/Posts/index.ts`, add the import:

```ts
import { fillPublishedAt } from './hooks/fillPublishedAt'
```

and add after the `versions` block:

```ts
  hooks: {
    beforeChange: [fillPublishedAt],
  },
```

- [ ] **Step 6: Verify end to end**

Run: `npm test`
Expected: green. Then in `npm run dev` → `/admin` → Posts → create a post with a title and slug only and publish it; confirm the sidebar date fills in and the post appears on `/cs/blog`.

- [ ] **Step 7: Commit**

```bash
git add src/collections/Posts tests/unit/posts/fill-published-at.test.ts
git commit -m "feat(posts): fill publishedAt on first publish"
```

---

### Task 7: Preview before publishing (T2-5)

**Files:**
- Create: `src/app/api/preview/route.ts`
- Modify: `src/collections/Posts/index.ts`
- Modify: `src/app/(frontend)/[locale]/blog/[slug]/page.tsx`

The route is authenticated with Payload's own admin session cookie rather than a shared secret, so no secret is embedded in the admin's client bundle. `/api/*` is already excluded from the next-intl middleware matcher (`src/middleware.ts`), so no locale redirect interferes.

- [ ] **Step 1: Write the preview route**

Create `src/app/api/preview/route.ts`:

```ts
import { headers as nextHeaders } from 'next/headers'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from '@/lib/payload'
import type { NextRequest } from 'next/server'

/**
 * Turns an admin "Preview" click into a Next draft-mode session. The gate is
 * the Payload session cookie — the Local API does not apply access control, so
 * an unauthenticated caller must be rejected here, before draft mode is on.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'cs'

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const payload = await getPayload()
  const { user } = await payload.auth({ headers: await nextHeaders() })

  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    return new Response('Not authorised to preview', { status: 401 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(`/${locale}/blog/${slug}`)
}
```

- [ ] **Step 2: Add the preview URL to the collection**

In `src/collections/Posts/index.ts`, inside the `admin` block, add:

```ts
    preview: (doc, { locale }) =>
      `/api/preview?slug=${encodeURIComponent(String(doc?.slug ?? ''))}&locale=${locale ?? 'cs'}`,
```

- [ ] **Step 3: Render drafts when draft mode is on**

In `src/app/(frontend)/[locale]/blog/[slug]/page.tsx`, add the import:

```ts
import { draftMode } from 'next/headers'
```

and replace the body of `fetchPost` with:

```ts
async function fetchPost(slug: string, locale: 'cs' | 'en') {
  const payload = await getPayload()
  const { isEnabled: isDraft } = await draftMode()
  const result = await payload.find({
    collection: 'posts',
    // In draft mode the published-and-due filter is dropped so an editor can
    // see unpublished and scheduled work. Everywhere else it must stay on.
    where: isDraft ? { slug: { equals: slug } } : publishedPostBySlugWhere(slug),
    draft: isDraft,
    depth: 2,
    limit: 1,
    locale,
  })
  return result.docs[0] ?? null
}
```

- [ ] **Step 4: Verify the happy path**

Run `npm run dev`, log into `/admin` as an admin, create a post but leave it as a draft, then click Preview.
Expected: redirected to `/cs/blog/<slug>` and the draft renders.

- [ ] **Step 5: Verify the gate**

In a private browser window with no admin session, open `http://localhost:3000/api/preview?slug=whatever`.
Expected: HTTP 401 `Not authorised to preview`. Then open `http://localhost:3000/cs/blog/<draft-slug>` in that same window.
Expected: 404 — drafts stay invisible without draft mode.

- [ ] **Step 6: Verify the suite**

Run: `npx tsc --noEmit && npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/preview/route.ts src/collections/Posts src/app/\(frontend\)
git commit -m "feat(posts): preview drafts via Next draft mode"
```

---

### Task 8: Restructure the Posts form (T2-7)

**Files:**
- Modify: `src/collections/Posts/index.ts`

- [ ] **Step 1: Group the fields into tabs**

Replace the `fields` array with a tabs layout. `slugField()` and every field keep their existing definitions — only the arrangement and the Czech descriptions change:

```ts
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Obsah',
          fields: [
            {
              name: 'title',
              type: 'text',
              localized: true,
              required: true,
              admin: { description: 'Nadpis článku, jak se zobrazí na webu.' },
            },
            slugField({ sourceField: 'title' }),
            {
              name: 'excerpt',
              type: 'textarea',
              localized: true,
              admin: {
                description:
                  'Krátký úvodník (2–3 věty) zobrazený v přehledu článků a na úvodní stránce.',
              },
            },
            {
              name: 'content',
              type: 'richText',
              localized: true,
              admin: {
                description:
                  'Text článku. Fotky můžete vkládat přímo do textu tlačítkem pro nahrání.',
              },
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Hlavní fotka článku. Zobrazí se v přehledu i v záhlaví článku.',
              },
            },
          ],
        },
        {
          label: 'Zařazení',
          fields: [
            {
              name: 'author',
              type: 'relationship',
              relationTo: 'authors',
              admin: { description: 'Kdo článek napsal.' },
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'post-categories',
              hasMany: true,
              admin: { description: 'Rubriky, do kterých článek patří.' },
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'seo',
              type: 'group',
              admin: {
                description:
                  'Nepovinné. Když necháte prázdné, použije se nadpis a úvodník článku.',
              },
              fields: [
                { name: 'metaTitle', type: 'text', localized: true },
                { name: 'metaDescription', type: 'textarea', localized: true },
                { name: 'metaImage', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Datum zveřejnění. Necháte-li prázdné, vyplní se při publikování. Budoucí datum článek zveřejní až v ten den.',
      },
    },
  ],
```

No custom React components are involved, so `generate:importmap` is not needed.

- [ ] **Step 2: Verify the field paths did not change**

Tabs without a `name` do not nest data, so `title`, `seo.metaTitle` and the rest keep their existing database columns. Confirm no migration is generated:

Run: `npx payload migrate:create form_tabs_check`
Expected: Payload reports no schema changes. If it generates a migration, a tab was given a `name` — remove it and delete the generated file.

- [ ] **Step 3: Verify the form and data**

Run: `npm run dev`, open an existing post in `/admin`.
Expected: three tabs, the existing content intact, `publishedAt` and the publish control in the sidebar.

- [ ] **Step 4: Verify types and suite**

Run: `npm run generate:types && npx tsc --noEmit && npm test`
Expected: green, and `src/payload-types.ts` shows no change to the `Post` shape.

- [ ] **Step 5: Commit**

```bash
git add src/collections/Posts/index.ts
git commit -m "feat(posts): group the admin form into Czech-labelled tabs"
```

---

### Task 9: Homepage news teaser (T2-8)

**Files:**
- Create: `src/components/blog/LatestPosts.tsx`
- Modify: `src/app/(frontend)/[locale]/page.tsx`
- Modify: `messages/cs.json`, `messages/en.json`

- [ ] **Step 1: Add the strings**

In `messages/cs.json`, inside the `home` object:

```json
    "news": {
      "title": "Aktuálně z farmy",
      "readMore": "Číst dál",
      "all": "Všechny články"
    }
```

In `messages/en.json`, inside `home`:

```json
    "news": {
      "title": "Latest from the farm",
      "readMore": "Read more",
      "all": "All posts"
    }
```

- [ ] **Step 2: Write the component**

Create `src/components/blog/LatestPosts.tsx`:

```tsx
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { getPayload } from '@/lib/payload'
import { getMediaUrl } from '@/lib/media'
import { Link } from '@/lib/i18n/routing'
import { publishedPostsWhere } from '@/lib/posts/queries'

type Props = {
  locale: 'cs' | 'en'
}

export async function LatestPosts({ locale }: Props) {
  const t = await getTranslations('home.news')
  const payload = await getPayload()

  const posts = await payload.find({
    collection: 'posts',
    where: publishedPostsWhere(),
    sort: '-publishedAt',
    limit: 3,
    depth: 1,
    locale,
  })

  // No news yet is a normal state — render nothing rather than an empty band.
  if (posts.docs.length === 0) return null

  return (
    <section className="px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl text-center mb-10">{t('title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.docs.map((post) => {
            const cover =
              post.coverImage && typeof post.coverImage === 'object' ? post.coverImage : null
            const imageUrl = getMediaUrl(cover)

            return (
              <Link
                key={post.id}
                href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }}
                className="group block bg-brand-cream text-brand-green-deep rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="aspect-[16/9] bg-brand-green-light relative overflow-hidden">
                  {imageUrl && (
                    <Image
                      src={imageUrl}
                      alt={cover?.alt || post.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-xl mb-2 group-hover:text-brand-green transition-colors">
                    {post.title}
                  </h3>
                  {post.publishedAt && (
                    <time
                      dateTime={post.publishedAt}
                      className="block text-sm text-brand-green-deep/70 mb-2"
                    >
                      {new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }).format(new Date(post.publishedAt))}
                    </time>
                  )}
                  {post.excerpt && (
                    <p className="text-brand-green-deep/75 line-clamp-3">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        <div className="text-center mt-8">
          <Link href="/blog" className="underline hover:no-underline">
            {t('all')}
          </Link>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Mount it on the homepage**

`src/app/(frontend)/[locale]/page.tsx` is currently a synchronous component. Convert its signature to async and read the locale from params, then render the teaser after the last existing `<section>`:

```tsx
import { LatestPosts } from '@/components/blog/LatestPosts'

type Props = {
  params: Promise<{ locale: 'cs' | 'en' }>
}

export const revalidate = 300

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  // ... existing sections unchanged ...
```

and immediately before the closing element of the returned tree:

```tsx
      <LatestPosts locale={locale} />
```

- [ ] **Step 4: Verify both locales**

Run: `npm run dev`, open `http://localhost:3000/cs` and `http://localhost:3000/en`.
Expected: the strip shows the existing post on both. Then set that post back to draft in the admin and reload.
Expected: the section disappears completely, with no empty band or stray heading.

- [ ] **Step 5: Verify types and suite**

Run: `npx tsc --noEmit && npm test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/blog/LatestPosts.tsx src/app/\(frontend\)/\[locale\]/page.tsx messages
git commit -m "feat(home): show the three latest farm posts"
```

---

### Task 10: Blog images to next/image (T2-9)

CLAUDE.md requires `next/image` everywhere. Media URLs are Payload-relative (`/api/media/file/…`), so `images.remotePatterns` stays empty.

**Files:**
- Modify: `src/app/(frontend)/[locale]/blog/page.tsx`
- Modify: `src/app/(frontend)/[locale]/blog/[slug]/page.tsx`

- [ ] **Step 1: Convert the list page**

Add the import:

```tsx
import Image from 'next/image'
```

and replace the `<img>` in the cover wrapper with:

```tsx
                      <Image
                        src={imageUrl}
                        alt={cover?.alt || post.title}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
```

- [ ] **Step 2: Convert the detail page's cover**

Add the same import, then replace the cover `<img>` with:

```tsx
            <Image
              src={coverUrl}
              alt={cover?.alt || post.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
```

`priority` is correct here — it is the page's LCP element.

- [ ] **Step 3: Convert the author avatar**

The avatar has known dimensions, so use width/height rather than `fill`:

```tsx
                <Image
                  src={avatarUrl}
                  alt={avatar?.alt || author.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
```

- [ ] **Step 4: Verify no raw img tags remain**

Run: `grep -n "<img" src/app/\(frontend\)/\[locale\]/blog/page.tsx src/app/\(frontend\)/\[locale\]/blog/\[slug\]/page.tsx`
Expected: no output. In-body images inside rich text still render through Payload's own converter, which is expected and out of scope.

- [ ] **Step 5: Verify rendering**

Run: `npm run dev`, open `/cs/blog` and a post.
Expected: images render, no console warnings about missing `sizes` or unconfigured hosts.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/blog
git commit -m "refactor(blog): render images with next/image"
```

---

### Task 11: Editor walkthrough (T2-10)

The point is to find what confuses a first-time author, not to prove the code runs.

- [ ] **Step 1: Create a real editor account**

In `/admin` as admin → Users → Create: role `Editor`, a real address the farm will use.
Expected: no email-verification wall on first login (Task 1).

- [ ] **Step 2: Walk the whole path as that user**

In a separate browser profile, logged in as the editor:

1. Confirm the sidebar shows exactly Posts, Media, Authors and Post Categories — no Orders, Users, Products or Settings.
2. Create an Author for the farm (name, role, avatar).
3. Write a post in Czech: title, excerpt, a few paragraphs.
4. Upload a cover photo, straight from a phone-sized file.
5. Insert a photo into the body text.
6. Save as draft, click Preview, confirm it renders.
7. Set `publishedAt` to tomorrow, publish, and confirm it is absent from `/cs/blog`.
8. Move the date to now and confirm it appears on `/cs/blog` and in the homepage strip within five minutes.

- [ ] **Step 3: Confirm the editor cannot reach anything else**

As the editor, request `/admin/collections/orders` directly by URL.
Expected: refused, not rendered. Then confirm the API is closed too:

Get the editor's token from the browser: DevTools → Application → Cookies →
`http://localhost:3000` → copy the `payload-token` value while logged in as the
editor. Then:

```bash
EDITOR_TOKEN='<paste the payload-token cookie value>'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:3000/api/products" -H "Content-Type: application/json" -b "payload-token=$EDITOR_TOKEN" -d '{"name":"Nope","slug":"nope","price":1,"unit":"ks"}'
```

Expected: `403`. Repeat with a *customer* account's token — that is the case
that was exploitable before Task 2, so it is the one worth seeing fail.

- [ ] **Step 4: Write the handover note**

Create a short Czech how-to for the farm covering: logging in, writing a post, adding photos, preview, publishing now vs scheduling. Fix anything that needed explaining twice rather than documenting around it.

- [ ] **Step 5: Final verification before the PR**

Run: `npx tsc --noEmit && npm test`
Expected: whole suite green, including every test added in Tasks 1–10.

- [ ] **Step 6: Hand over**

Report to Jan what was added, what the walkthrough exposed, and anything deferred. He opens the PR from `devel`. PR2 is complete when Tasks 1–11 are checked.
