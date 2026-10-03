# Dev Environment Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Commits:** Jan commits and opens PRs himself. Commit steps are written out, but confirm with him before running them.

**Goal:** Give `dev.kurnik-sopa.cz` its own branch and database, and restore media uploads in every environment.

**Architecture:** `devel` deploys to `dev.kurnik-sopa.cz` against a Neon branch database; `main` stays idle until the production cutover. Media uploads go browser → R2 directly where an R2 CORS entry exists (deployed origins), and browser → Next → R2 everywhere else (local, feature-branch previews), selected by the `ENABLE_CLIENT_UPLOADS` environment variable.

**Tech Stack:** Payload CMS 3.84, Next.js 15.4, Vercel, Neon Postgres, Cloudflare R2, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-12-dev-environment-split-and-farm-publishing-design.md`
**Tickets:** T1-1 … T1-7 in `docs/superpowers/tickets/2026-09-12-dev-split-and-publishing-tickets.md`

---

### Task 1: Env-gated client uploads (T1-6)

Today `src/payload.config.ts:102` hardcodes `clientUploads: true`, which makes the browser PUT straight to R2. R2 has no CORS policy, so every admin upload fails with `TypeError: Failed to fetch`. We put the choice behind an environment variable, via a helper we can test.

**Files:**
- Create: `src/lib/uploads.ts`
- Create: `tests/unit/uploads/client-uploads.test.ts`
- Modify: `src/payload.config.ts:102`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/uploads/client-uploads.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { clientUploadsEnabled } from '@/lib/uploads'

describe('clientUploadsEnabled', () => {
  it('is false when the variable is unset', () => {
    expect(clientUploadsEnabled({})).toBe(false)
  })

  it('is true for "true" and "1", case- and whitespace-insensitive', () => {
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'true' })).toBe(true)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'TRUE' })).toBe(true)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: ' 1 ' })).toBe(true)
  })

  it('is false for anything else', () => {
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'false' })).toBe(false)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: 'yes' })).toBe(false)
    expect(clientUploadsEnabled({ ENABLE_CLIENT_UPLOADS: '' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit tests/unit/uploads/client-uploads.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/uploads"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/uploads.ts`:

```ts
/**
 * Direct browser → R2 uploads need an R2 CORS entry for the calling origin.
 * We can only enumerate stable origins (localhost, dev, apex), so environments
 * with unpredictable URLs (feature-branch previews) fall back to the
 * server-side path. That path is subject to Vercel's ~4.5 MB request body cap,
 * which is why deployed stable origins keep the direct path — farm photos run
 * 5–12 MB.
 */
export function clientUploadsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.ENABLE_CLIENT_UPLOADS?.trim().toLowerCase()
  return raw === 'true' || raw === '1'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit tests/unit/uploads/client-uploads.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire it into the Payload config**

In `src/payload.config.ts`, add to the imports at the top:

```ts
import { clientUploadsEnabled } from '@/lib/uploads'
```

and replace line 102:

```ts
      clientUploads: clientUploadsEnabled(),
```

- [ ] **Step 6: Verify the whole suite and types still pass**

Run: `npx tsc --noEmit && npm test`
Expected: tsc silent; all unit + integration tests pass.

Note: the parameter must be typed `Record<string, string | undefined>`, not
`{ ENABLE_CLIENT_UPLOADS?: string }`. `process.env` is `ProcessEnv`, which
declares only an index signature, and TypeScript's weak-type check rejects
assigning it to an all-optional object type (`TS2559: no properties in
common`).

- [ ] **Step 7: Verify an upload works locally**

With `ENABLE_CLIENT_UPLOADS` unset in `.env`, run `docker-compose up -d && npm run dev`, open `http://localhost:3000/admin`, go to Media → Create, and upload any image.
Expected: the upload completes and a thumbnail renders. This is the bug recorded in the `r2-cors-admin-uploads` memory — it should now be gone locally without any Cloudflare change.

- [ ] **Step 8: Commit**

```bash
git add src/lib/uploads.ts tests/unit/uploads/client-uploads.test.ts src/payload.config.ts
git commit -m "fix(media): gate direct R2 uploads on ENABLE_CLIENT_UPLOADS"
```

---

### Task 2: Document the environments (T1-6 cont.)

**Files:**
- Modify: `.env.example`
- Modify: `/Users/janantl/Work/KurnikSopa/CLAUDE.md`

- [ ] **Step 1: Add the new variables to `.env.example`**

Append:

```bash
# Direct browser → R2 uploads. Set to "true" only where the origin is listed in
# the R2 bucket CORS policy (localhost, dev.kurnik-sopa.cz, the apex).
# Unset elsewhere: uploads then route through the Next server, which is capped
# at ~4.5 MB per request on Vercel.
ENABLE_CLIENT_UPLOADS=
```

- [ ] **Step 2: Add an Environments section to CLAUDE.md**

Insert after the "Repo Layout" section:

```markdown
## Environments

| Branch | Domain | Database |
|--------|--------|----------|
| `devel` | `dev.kurnik-sopa.cz` | Neon branch `dev` |
| `main`  | `kurnik-sopa.vercel.app` (apex after cutover) | Neon `production` |

`devel` is the integration branch and the default base for feature branches.
`main` is reserved for the production cutover. All Vercel preview deployments
read the Neon `dev` branch, so a feature branch carrying a migration should be
merged promptly rather than left open.

At cutover the Neon `dev` branch is promoted to default, so content the farm
authored on dev becomes production data. Full procedure: the "Cutover
procedure" section of
`docs/superpowers/specs/2026-09-12-dev-environment-split-and-farm-publishing-design.md`.
```

- [ ] **Step 3: Fix the two stale facts in CLAUDE.md**

Replace every occurrence of `kurniksopa.cz` with `kurnik-sopa.cz` — the hyphenated form is the domain that DNS and Resend actually verify. Verify none remain:

Run: `grep -rn "kurniksopa" /Users/janantl/Work/KurnikSopa/CLAUDE.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add .env.example ../CLAUDE.md
git commit -m "docs: document devel/main environments and fix domain spelling"
```

---

### Task 3 [manual]: Provision the split (T1-1 … T1-5)

Dashboard work, in this order. Nothing here is in git.

- [ ] **Step 1: Create the Neon `dev` branch**

Neon console → the Frankfurt project → Branches → New branch, named `dev`, parent `production`. Copy the **pooled** connection string.

Verify it carries the existing data:

```bash
psql "<dev connection string>" -c 'select count(*) from posts; select count(*) from products;'
```

Expected: the same counts as production.

- [ ] **Step 2: Create and push the `devel` branch**

```bash
git checkout main && git pull
git checkout -b devel
git push -u origin devel
```

- [ ] **Step 3: Mirror branch protection onto `devel`**

GitHub → Settings → Rules → Rulesets → duplicate `require-tests-on-main`, target branch `devel`, required status check `test`.

Verify: open a throwaway PR against `devel` and confirm the `test` check is listed as required, then close it.

- [ ] **Step 4: Set the Vercel environment variables**

| Scope | Variable | Value |
|---|---|---|
| Preview | `DATABASE_URI` | Neon `dev` pooled string |
| Preview | `NEXT_PUBLIC_SITE_URL` | `https://dev.kurnik-sopa.cz` |
| Preview, **branch `devel` only** | `ENABLE_CLIENT_UPLOADS` | `true` |
| Production | `ENABLE_CLIENT_UPLOADS` | `true` |

Leave the Production `DATABASE_URI` pointing at Neon `production`.

Verify: `vercel env ls` (after `vercel link`) shows `ENABLE_CLIENT_UPLOADS` against branch `devel`, not all previews.

- [ ] **Step 5: Repoint the domain**

Vercel → Settings → Domains → `dev.kurnik-sopa.cz` → Git Branch = `devel`.

- [ ] **Step 6: Apply the R2 CORS policy**

Cloudflare → R2 → `kurnik-sopa-media` → Settings → CORS Policy:

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

Verify the preflight is answered (substitute the account ID from CLAUDE.md):

```bash
curl -sI -X OPTIONS "https://912ba38828e53bb5299967760cb346eb.r2.cloudflarestorage.com/kurnik-sopa-media/cors-probe" -H "Origin: https://dev.kurnik-sopa.cz" -H "Access-Control-Request-Method: PUT" | grep -i "access-control-allow-origin"
```

Expected: a header echoing `https://dev.kurnik-sopa.cz`. No header means the policy has not taken effect yet.

---

### Task 4: Verify the split end to end (T1-7)

- [ ] **Step 1: Deploy `devel`**

```bash
git push origin devel
```

Watch the Vercel deployment for `dev.kurnik-sopa.cz` and confirm it built from `devel`.

- [ ] **Step 2: Confirm the dev site reads the dev database**

Edit a product's name in `https://dev.kurnik-sopa.cz/admin`, save, then check production's data is untouched:

```bash
psql "<production connection string>" -c "select name from products_locales where _locale='cs' limit 5;"
```

Expected: the old name. The edit exists only in the Neon `dev` branch.

- [ ] **Step 3: Confirm large uploads work on dev**

In `https://dev.kurnik-sopa.cz/admin` → Media → Create, upload a 6–10 MB phone photo.
Expected: it completes and renders. A failure here with a CORS error means Step 6 of Task 3 has not applied; a failure with a 413 means `ENABLE_CLIENT_UPLOADS` is not reaching the deployment.

- [ ] **Step 4: Confirm `main` no longer drives the dev domain**

Push an empty commit to `main` and confirm `dev.kurnik-sopa.cz` does **not** redeploy:

```bash
git checkout main && git commit --allow-empty -m "chore: verify main no longer deploys dev" && git push
```

- [ ] **Step 5: Open the PR**

Jan opens the PR from `devel`'s first feature branch, or merges directly if the code changes were made on `devel`. PR1 is complete when Tasks 1–4 are all checked.
