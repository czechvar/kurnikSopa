# Phase 4 — Test Framework Introduction

**Status:** design, not yet implemented
**Date:** 2026-05-18
**Author:** brainstorming with Claude (session: `phase-4`)

## 1. Goals & non-goals

### Goals

- Introduce an automated test framework into the repo (currently zero tests) as
  Phase 4's first deliverable, before piling on new features.
- Lock in regression coverage on the highest-risk code that just shipped in
  Phase 3a/3b: SPAYD/QR payment string generation, order placement, cart
  upsert, and access-control rules.
- Establish a CI gate (GitHub Actions on push + PR) so future PRs can't merge
  while tests are red.
- Set patterns (file layout, helpers, DB lifecycle, email spy) that the rest of
  Phase 4 features will extend without re-deciding.

### Non-goals

- **Playwright / browser e2e** — deferred. Pure-function and Local-API
  integration tests cover the critical path; Playwright comes when a UI flow
  is worth defending end-to-end (Stripe checkout, OAuth flow, etc.).
- **Frontend component tests** — no jsdom, no React Testing Library this round.
  Server Components dominate the storefront; testing them in isolation has low
  ROI vs. integration-testing the server boundary they call into.
- **Email template snapshot tests** — `src/lib/email/templates.ts` is not
  covered by content snapshots. Integration tests assert "an email was sent
  with the right subject/attachment", not the rendered HTML body. Can be
  added later as a quick follow-up.
- **R2 / media-upload tests** — no critical-path coverage need.
- **Stripe tests** — Stripe isn't wired yet.
- **Coverage thresholds / reporters** — not gated in CI. Add later once we
  see what the baseline looks like.

## 2. Architecture overview

One Vitest installation, two Vitest "projects" inside a single config:

- **`unit`** — runs against pure functions in `src/lib/payment/*`. No
  globalSetup, no DB, no Payload bootstrap. Sub-second on a cold cache.
- **`integration`** — runs against a real Postgres test database with
  Payload's Local API. `globalSetup` provisions the DB once per run;
  `beforeEach` truncates user-data tables. Email goes through an in-memory
  spy adapter.

`npm test` runs both projects. `npm test -- --project unit` runs just the
fast lane (useful when Docker isn't running locally).

Tests live under `tests/` at the repo root — outside `src/` — so the Next.js
build doesn't compile them and Payload doesn't try to load them as collection
files.

## 3. File layout

```
repo/
├── tests/
│   ├── setup/
│   │   ├── global-setup.ts        # drop+create test DB, run payload migrate
│   │   ├── reset-db.ts            # truncate helper (explicit table list)
│   │   └── email-spy.ts           # in-memory captured emails + spy adapter
│   ├── helpers/
│   │   ├── payload.ts             # cached getPayload bound to spy adapter
│   │   └── factories.ts           # createTestUser/Product/Cart/SiteSettings
│   ├── unit/
│   │   └── payment/
│   │       ├── spayd.test.ts
│   │       ├── iban.test.ts
│   │       └── qr.test.ts
│   └── integration/
│       ├── orders/
│       │   └── place-order.test.ts
│       ├── cart/
│       │   └── get-or-create-cart.test.ts
│       └── access-control/
│           ├── users.test.ts
│           ├── orders.test.ts
│           └── carts.test.ts
├── vitest.config.ts
├── .env.test                      # committed, no secrets
└── .github/workflows/test.yml
```

## 4. Dependencies

New `devDependencies`:

- `vitest`

That's the only addition. `@types/node` is already in `devDependencies`.
Vitest handles TypeScript natively via `esbuild` — no `tsx` or `ts-node`
needed. No `@vitest/coverage-v8` (no coverage gate in scope). No `jsdom`
(no DOM tests).

## 5. `package.json` scripts

```
"test":       "vitest run",
"test:watch": "vitest",
```

`test:db:reset` is not exposed as a script — the helper is internal and only
called from `beforeEach`.

## 6. Test DB lifecycle

### 6.1 globalSetup

`tests/setup/global-setup.ts`, registered via `vitest.config.ts → globalSetup`,
runs once before any integration test:

1. Read `DATABASE_URI` from `.env.test` (or the CI environment).
2. **Safety guard:** if the DB name does not end in `_test`, abort with
   `Refusing to run tests against ${name}`. This refusal is non-negotiable —
   it exists so a misconfigured env can never nuke a real DB.
3. Connect to the admin `postgres` DB and run:
   `DROP DATABASE IF EXISTS kurnik_sopa_test; CREATE DATABASE kurnik_sopa_test;`
4. Shell out to `npx payload migrate` with `DATABASE_URI` pointed at the test
   DB. This is the same command Vercel runs in `buildCommand`, so any
   migration that works in prod works here. Cost: ~3-5s on first run.
5. Return a teardown function that drops the DB on clean exit (so `Ctrl-C`
   leaves a clean instance).

The migrator is invoked as a child process, not programmatically. Rationale:
mirror Vercel's `buildCommand` exactly. If `payload migrate` ever changes its
exit-code semantics or argument shape, both prod and tests find out together.

### 6.2 resetDb

`tests/setup/reset-db.ts` is called from `beforeEach` in every integration
file:

```ts
await sql`TRUNCATE TABLE
  orders, carts, users, products, product_categories, media,
  posts, post_categories, authors, events, event_registrations, pages
  RESTART IDENTITY CASCADE`
```

The table list is **explicit and hand-maintained**, not discovered via
`pg_tables`. Rationale: schema-bearing tables (`payload_migrations`,
`payload_preferences`, `payload_locked_documents`) must not be truncated, and
Payload globals (`site-settings`, `navigation`, `footer`) live in their own
`globals_*` tables we may or may not want reset per test. The explicit list
forces a conscious decision when a collection is added — that friction is the
point.

The exact table names (including any `_rels`, `_locales`, or array-field
sibling tables Payload generates) will be confirmed against the
`payload migrate` output during implementation. `CASCADE` covers most sibling
tables transitively; the implementation step will verify which siblings
remain populated after `TRUNCATE` and add them to the list if needed.

`RESTART IDENTITY` resets sequences so order numbers and IDs are predictable
across tests (e.g. the first order in any test is always `202600000001`).

### 6.3 Per-test helper

`tests/helpers/payload.ts` exports a cached, fully-bootstrapped Payload
instance. Tests do:

```ts
import { payload } from '../../helpers/payload'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

beforeEach(async () => {
  await resetDb()
  resetEmails()
})
```

## 7. Email mocking

`tests/setup/email-spy.ts`:

```ts
type Captured = {
  to: string; from: string; subject: string;
  html?: string; text?: string; attachments?: unknown[]
}
export const capturedEmails: Captured[] = []
export const resetEmails = () => { capturedEmails.length = 0 }

export const emailSpyAdapter = () => ({
  name: 'spy',
  defaultFromAddress: 'spy@test.local',
  defaultFromName: 'Test',
  sendEmail: async (message) => { capturedEmails.push(message as Captured) },
})
```

`tests/helpers/payload.ts` resolves the production config, swaps `.email` for
the spy, then passes the patched config to `getPayload`:

```ts
import baseConfig from '@payload-config'
import { getPayload } from 'payload'
import { emailSpyAdapter } from '../setup/email-spy'

const config = { ...(await baseConfig), email: emailSpyAdapter() }
export const payload = await getPayload({ config })
```

Production `payload.config.ts` is **not modified**. The spy wins regardless of
whether `RESEND_API_KEY` is set in the test env because the spread-then-assign
pattern unconditionally replaces `.email`.

Tests assert against `capturedEmails`:

```ts
expect(capturedEmails).toHaveLength(2)
expect(capturedEmails[0].subject).toContain('Objednávka 202600000001')
expect(capturedEmails[0].attachments?.[0]).toMatchObject({ cid: 'order-qr' })
```

## 8. Test catalog

### 8.1 `tests/unit/payment/spayd.test.ts` (~8 tests)

Pure functions, no DB.

- Builds the canonical `SPD*1.0*ACC:...*AM:...*CC:CZK*X-VS:...*MSG:...`
  string against a known fixture.
- Amount formats with `.toFixed(2)`: `1234.5 → "1234.50"`, `0 → "0.00"`.
- VS strips non-digits and truncates to 10
  (`"2026-000001" → "2026000001"`).
- Message: diacritics stripped (`"Příliš žluťoučký" → "Prilis zlutoucky"`),
  non-printable removed, truncated to 60 chars.
- CZK currency code is always literal `CZK`.
- Empty-string message, VS already 10 digits, amount with `0.1+0.2`-style
  floats.

### 8.2 `tests/unit/payment/iban.test.ts` (~6 tests)

- Known fixture: `deriveCzIban("", "2901234567", "2010")` → expected IBAN
  (verified against an external IBAN calculator).
- Prefix zero-padded to 6, account to 10, bank code stays 4.
- Strips non-digits in all three inputs.
- Throws on empty account.
- Throws on `bankCode.length !== 4` after stripping.
- Check-digit math: 2-3 reference accounts against an external IBAN
  calculator.

### 8.3 `tests/unit/payment/qr.test.ts` (~2 tests)

- `renderQrPng(spayd)` returns a `Buffer` starting with the PNG magic bytes
  `89 50 4E 47`.
- Buffer length within a sane range (smoke check that it's actually image
  bytes, not an error).

### 8.4 `tests/integration/orders/place-order.test.ts` (~10 tests)

Each test seeds via `factories.ts` (`createUser`, `createProduct`,
`createCart`, `setSiteSettings`), then calls `placeOrder(payload, input)`
directly — the same path `POST /api/orders/place` uses.

**Happy paths:**

- `bank_transfer` order returns `{ ok: true, orderNumber: "202600000001" }`,
  creates an Order row, snapshots `priceAtPurchase`, generates `qrSpayd`,
  sends 2 emails, deletes the cart.
- `cash_on_delivery` order: same but `qrSpayd: null`, no QR attachment on the
  email, no IBAN check.
- `delivery` vs `pickup`: `deliveryAddress` persisted only when `delivery`.

**Validation rejections** (each returns `{ ok: false, errors, reason? }`,
no Order created, `capturedEmails` length 0):

- empty cart → `reason: 'cartEmpty'`
- product not found
- `inStock: false` → `outOfStock`
- `stockQuantity < quantity` → `insufficientStock`
- `quantity < minimumOrder` → `belowMinimumOrder` with `min` populated
- seasonal product outside window → `outOfSeason`
- `bank_transfer` with no `SiteSettings.payment.accountNumber` →
  `reason: 'paymentMethodMissingBankDetails'`

**Side-effect specifics:**

- Order# is sequential year-based (`202600000001` → `202600000002`).
- `capturedEmails[0]` is the customer email, `[1]` is staff; subject contains
  the order#; attachment has `cid: 'order-qr'` only for `bank_transfer`.
- Cart row is gone after success.

### 8.5 `tests/integration/cart/get-or-create-cart.test.ts` (~3 tests)

- First call for a user creates a row.
- Second call for the same user returns the same row (idempotent).
- Different users get different rows.

### 8.6 `tests/integration/access-control/` (~7 tests)

Re-encodes the Phase 3a §8 security checklist.

**`users.test.ts`**

- A user can read their own `User` doc; another user cannot.
- A user cannot update their own `role` or `email` (admin-only fields).
- An admin can update any user.

**`orders.test.ts`**

- A customer can list/read only their own orders.
- A customer cannot mutate `paymentStatus` or `orderStatus`.
- A `staff` user can update only `paymentStatus`, `orderStatus`, `notes`.
- An admin can do everything.

**`carts.test.ts`**

- A user can read/update only their own cart.
- One row per user.

## 9. CI

`.github/workflows/test.yml`:

```yaml
name: test
on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: kurnik
          POSTGRES_PASSWORD: kurnik
          POSTGRES_DB: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U kurnik"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URI: postgresql://kurnik:kurnik@localhost:5432/kurnik_sopa_test
      PAYLOAD_SECRET: ci-only-not-a-real-secret-min-32-chars
      NEXT_PUBLIC_SITE_URL: http://localhost:3000

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm install --legacy-peer-deps
      - run: npx payload generate:types
      - run: npm test
```

**Choices:**

- `postgres:16-alpine` mirrors local `docker-compose.yml` exactly.
- `POSTGRES_DB: postgres` (admin DB). `globalSetup` creates `kurnik_sopa_test`
  itself, so the same code path runs locally and in CI.
- `npx payload generate:types` is required because `payload-types.ts` is
  gitignored; integration tests import from `@/payload-types`.
- `--legacy-peer-deps` matches `vercel.json`'s `installCommand`.
- No `STRIPE_*`, `S3_*`, `RESEND_API_KEY`, `EMAIL_FROM` in the env — tests
  don't need them; the spy adapter declares its own `defaultFromAddress`.

**Branch protection** (require the `test` check before merge to `main`) is a
manual GitHub Settings step, called out in the PR description but not part of
the code changes.

## 10. Local equivalent

`.env.test` committed at the repo root (no secrets — safe to commit):

```
DATABASE_URI=postgresql://kurnik:kurnik@localhost:5432/kurnik_sopa_test
PAYLOAD_SECRET=local-test-secret-min-32-chars
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Vitest loads `.env.test` automatically because tests run with `mode: 'test'`.

The test DB (`kurnik_sopa_test`) sits on the same local Postgres as dev data
(`kurnik_sopa`). Running tests does not touch dev data. Worth a one-line note
in the README.

## 11. Deliverables

This PR adds, in one branch:

1. `vitest` to `devDependencies`.
2. `vitest.config.ts` with two projects (`unit`, `integration`).
3. `tests/setup/` (3 files), `tests/helpers/` (2 files).
4. `tests/unit/payment/*.test.ts` (3 files, ~16 tests).
5. `tests/integration/**/*.test.ts` (5 files, ~20 tests).
6. `.github/workflows/test.yml`.
7. `.env.test` at repo root.
8. `package.json` scripts: `test`, `test:watch`.
9. README update: short "Running tests" section.

## 12. Verification plan

Before merge:

1. `npm test` passes locally (Docker Postgres running).
2. `npm test -- --project unit` passes locally without Docker.
3. CI green on the feature branch PR.
4. Manually `git checkout main && npm test` — confirms tests gate against the
   already-shipped code, not just the branch's changes.

## 13. Open follow-ups (not in this PR)

- Email template snapshot tests (`templates.ts`).
- Order number unit test (`orderNumber.ts` — covered transitively).
- Playwright e2e when first UI flow is worth defending end-to-end.
- Coverage report + threshold once baseline is known.
- Branch protection rule on `main` (manual GitHub Settings).
