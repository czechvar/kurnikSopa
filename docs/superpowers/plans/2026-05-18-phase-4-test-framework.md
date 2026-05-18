# Phase 4 — Test Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce Vitest into the repo with critical-path coverage of SPAYD/QR generation, order placement, cart upsert, and access-control rules — gated by GitHub Actions CI.

**Architecture:** Two Vitest projects in one config: `unit` (pure functions, no DB) and `integration` (real Postgres test DB + Payload Local API). Production `payload.config.ts` stays untouched; the test helper swaps the email adapter for an in-memory spy. CI uses a Postgres service container that mirrors `docker-compose.yml`.

**Tech Stack:** Vitest, GitHub Actions, Postgres 16-alpine, Payload CMS v3 Local API. Spec: `docs/superpowers/specs/2026-05-18-phase-4-test-framework-design.md`.

**Working directory for all paths:** `repo/` (the Next.js + Payload app, not the repo root).

**Commit policy:** The user prefers to run `git add` / `git commit` themselves after reviewing each task locally (see auto-memory `user_commit_pr_control`). Each task ends with a **Suggested commit (user runs)** block — a recommended message and file list, not a shell command to execute.

**Working against existing code:** Almost every function under test (`buildSpayd`, `deriveCzIban`, `renderQrPng`, `placeOrder`, `getOrCreateCart`, access rules) already ships in `main`. These tests are **characterization tests**: the expected outcome is a green test on first run. If a test fails, treat the implementation as suspect *only after* confirming the test's expectation matches the spec — most early failures will be wrong fixtures, not real bugs.

---

## File map

**New:**
- `repo/vitest.config.ts`
- `repo/.env.test`
- `repo/.github/workflows/test.yml`
- `repo/tests/setup/global-setup.ts`
- `repo/tests/setup/reset-db.ts`
- `repo/tests/setup/email-spy.ts`
- `repo/tests/helpers/payload.ts`
- `repo/tests/helpers/factories.ts`
- `repo/tests/unit/payment/spayd.test.ts`
- `repo/tests/unit/payment/iban.test.ts`
- `repo/tests/unit/payment/qr.test.ts`
- `repo/tests/integration/cart/get-or-create-cart.test.ts`
- `repo/tests/integration/orders/place-order.test.ts`
- `repo/tests/integration/access-control/users.test.ts`
- `repo/tests/integration/access-control/orders.test.ts`
- `repo/tests/integration/access-control/carts.test.ts`

**Modified:**
- `repo/package.json` — add `vitest` devDep, add `test` and `test:watch` scripts
- `repo/README.md` — add "Running tests" section
- `repo/.gitignore` — ignore `node_modules/.vitest` cache if it ends up there

---

## Task 1: Install Vitest and scaffold config

**Files:**
- Create: `repo/vitest.config.ts`
- Create: `repo/.env.test`
- Modify: `repo/package.json`

- [ ] **Step 1: Install vitest as a devDependency**

Run from `repo/`:
```bash
npm install --save-dev --legacy-peer-deps vitest
```

Expected: `vitest` added to `devDependencies` in `package.json`, `package-lock.json` updated. The `--legacy-peer-deps` flag matches `vercel.json`.

- [ ] **Step 2: Add npm scripts**

Edit `repo/package.json`. In the `"scripts"` block, after `"seed": "..."`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create `repo/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@payload-config': path.resolve(__dirname, './src/payload.config.ts'),
    },
  },
  test: {
    env: {
      NODE_ENV: 'test',
    },
    // Load .env.test automatically.
    setupFiles: [],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/setup/global-setup.ts'],
          // Integration tests must run serially against a shared DB.
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
```

- [ ] **Step 4: Create `.env.test`**

Create `repo/.env.test`:

```
DATABASE_URI=postgresql://kurnik:kurnik@localhost:5432/kurnik_sopa_test
PAYLOAD_SECRET=local-test-secret-min-32-characters-long-ok
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

This file is committed (contains no real secrets). Vitest loads it because `NODE_ENV=test`.

- [ ] **Step 5: Verify `npm test` runs cleanly**

Run from `repo/`:
```bash
npm test
```

Expected: Vitest starts, reports "No test files found" or finds 0 tests, exits 0. If it errors on `@payload-config`, the alias is wrong — re-check Step 3.

- [ ] **Step 6: Suggested commit (user runs)**

```
git add package.json package-lock.json vitest.config.ts .env.test
git commit -m "chore: scaffold vitest with unit + integration projects"
```

---

## Task 2: SPAYD unit tests

**Files:**
- Create: `repo/tests/unit/payment/spayd.test.ts`

Reference source: `repo/src/lib/payment/spayd.ts`.

- [ ] **Step 1: Write the test file**

Create `repo/tests/unit/payment/spayd.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildSpayd } from '@/lib/payment/spayd'

describe('buildSpayd', () => {
  it('builds the canonical SPAYD string with all fields', () => {
    const out = buildSpayd({
      iban: 'CZ6520100000002901234567',
      amount: 1234.5,
      variableSymbol: '202600000001',
      message: 'Kurnik Sopa 202600000001',
    })
    expect(out).toBe(
      'SPD*1.0*ACC:CZ6520100000002901234567*AM:1234.50*CC:CZK*X-VS:2026000000*MSG:Kurnik Sopa 202600000001',
    )
  })

  it('formats amount with two decimals when whole', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 0, variableSymbol: '1', message: 'x' })
    expect(out).toContain('AM:0.00')
  })

  it('formats amount with two decimals when one decimal', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 50.5, variableSymbol: '1', message: 'x' })
    expect(out).toContain('AM:50.50')
  })

  it('always uses CZK currency code', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: 'x' })
    expect(out).toContain('CC:CZK')
  })

  it('strips non-digits from variable symbol and truncates to 10 digits', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '2026-000001234', message: 'x' })
    expect(out).toContain('X-VS:2026000001')
  })

  it('strips diacritics from message', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: 'Příliš žluťoučký kůň' })
    expect(out).toContain('MSG:Prilis zlutoucky kun')
  })

  it('truncates message to 60 characters after ASCII normalization', () => {
    const long = 'a'.repeat(100)
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: long })
    const msg = out.split('MSG:')[1]
    expect(msg).toHaveLength(60)
  })

  it('removes non-printable characters from message', () => {
    const out = buildSpayd({ iban: 'CZ00', amount: 1, variableSymbol: '1', message: 'hi\x00\x07there' })
    expect(out).toContain('MSG:hithere')
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project unit
```

Expected: All 8 tests in `tests/unit/payment/spayd.test.ts` PASS.

If any test FAILS: re-read `src/lib/payment/spayd.ts` and the SPAYD spec link in its docstring. Confirm whether the fixture is wrong (most likely) or the implementation has a bug. If the impl is buggy, file a follow-up and adjust the test to the buggy behavior with a `// TODO: see <ticket>` only if explicitly approved by the user.

- [ ] **Step 3: Suggested commit (user runs)**

```
git add tests/unit/payment/spayd.test.ts
git commit -m "test(payment): cover buildSpayd format, encoding, truncation"
```

---

## Task 3: IBAN unit tests

**Files:**
- Create: `repo/tests/unit/payment/iban.test.ts`

Reference source: `repo/src/lib/payment/iban.ts`. Cross-check IBAN check digits against an external calculator like https://www.iban.com/calculate-iban (use ONLY to verify reference values — do not paste real account numbers).

- [ ] **Step 1: Write the test file**

Create `repo/tests/unit/payment/iban.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveCzIban } from '@/lib/payment/iban'

describe('deriveCzIban', () => {
  it('builds a 24-character CZ IBAN from a known fixture', () => {
    const iban = deriveCzIban('', '2901234567', '2010')
    expect(iban).toHaveLength(24)
    expect(iban.startsWith('CZ')).toBe(true)
    // Reference value verified against iban.com — adjust this only if iban.com agrees.
    expect(iban).toBe('CZ6520100000002901234567')
  })

  it('zero-pads prefix to 6 digits and account to 10', () => {
    const iban = deriveCzIban('19', '12345', '0800')
    // Prefix → 000019, account → 0000012345, bank → 0800.
    expect(iban).toMatch(/^CZ\d{22}$/)
    expect(iban.slice(-16)).toBe('0000019000001234'.slice(0, 16))
    // The last 16 chars are prefix(6)+account(10). Verify the suffix shape:
    expect(iban.slice(-10)).toBe('0000012345')
    expect(iban.slice(-16, -10)).toBe('000019')
    expect(iban.slice(-20, -16)).toBe('0800')
  })

  it('strips non-digit characters from all inputs', () => {
    const a = deriveCzIban(' 19 ', '12-34-5', '0800')
    const b = deriveCzIban('19', '12345', '0800')
    expect(a).toBe(b)
  })

  it('throws on empty account', () => {
    expect(() => deriveCzIban('', '', '0800')).toThrow(/invalid input/i)
    expect(() => deriveCzIban('', '   ', '0800')).toThrow(/invalid input/i)
  })

  it('throws when bank code is not 4 digits after stripping', () => {
    expect(() => deriveCzIban('', '12345', '80')).toThrow(/invalid input/i)
    expect(() => deriveCzIban('', '12345', '08000')).toThrow(/invalid input/i)
  })

  it('produces the correct check digit for a second reference account', () => {
    // KB account 35-1234567890/0100 — verify against iban.com before committing.
    const iban = deriveCzIban('35', '1234567890', '0100')
    expect(iban).toMatch(/^CZ\d{22}$/)
    // Replace the line below with the verified value from iban.com:
    expect(iban).toBe('CZ4901000000351234567890')
  })
})
```

- [ ] **Step 2: Verify the second reference IBAN**

Before running tests, paste `prefix=35, account=1234567890, bankCode=0100` into https://www.iban.com/calculate-iban (Czech Republic). Confirm the returned IBAN matches the value in Step 1's last test. If different, update the test to the verified value (the function is correct; my reference value may be wrong).

- [ ] **Step 3: Run the tests**

```bash
npm test -- --project unit tests/unit/payment/iban.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 4: Suggested commit (user runs)**

```
git add tests/unit/payment/iban.test.ts
git commit -m "test(payment): cover deriveCzIban padding, stripping, check digit"
```

---

## Task 4: QR unit tests

**Files:**
- Create: `repo/tests/unit/payment/qr.test.ts`

Reference source: `repo/src/lib/payment/qr.ts`.

- [ ] **Step 1: Write the test file**

Create `repo/tests/unit/payment/qr.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderQrPng } from '@/lib/payment/qr'

describe('renderQrPng', () => {
  it('returns a Buffer with the PNG magic header', async () => {
    const png = await renderQrPng('SPD*1.0*ACC:CZ00*AM:1.00*CC:CZK*X-VS:1*MSG:x')
    expect(Buffer.isBuffer(png)).toBe(true)
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  })

  it('produces a non-trivial image (>100 bytes) for a real SPAYD string', async () => {
    const png = await renderQrPng('SPD*1.0*ACC:CZ6520100000002901234567*AM:1234.50*CC:CZK*X-VS:202600000001*MSG:Kurnik Sopa 202600000001')
    expect(png.length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project unit tests/unit/payment/qr.test.ts
```

Expected: Both tests PASS.

- [ ] **Step 3: Verify unit-only run is fast**

```bash
time npm test -- --project unit
```

Expected: All 16 unit tests across spayd/iban/qr finish in < 3s on a warm cache.

- [ ] **Step 4: Suggested commit (user runs)**

```
git add tests/unit/payment/qr.test.ts
git commit -m "test(payment): cover renderQrPng output shape"
```

---

## Task 5: Test DB infrastructure + first integration test

**Files:**
- Create: `repo/tests/setup/global-setup.ts`
- Create: `repo/tests/setup/reset-db.ts`
- Create: `repo/tests/setup/email-spy.ts`
- Create: `repo/tests/helpers/payload.ts`
- Create: `repo/tests/helpers/factories.ts`
- Create: `repo/tests/integration/cart/get-or-create-cart.test.ts`

This task wires up everything needed for integration tests AND adds the smallest integration test (cart upsert) as proof. Larger than other tasks; do not skip the verification steps.

- [ ] **Step 1: Ensure local Postgres is running**

```bash
docker-compose up -d
docker ps | grep postgres
```

Expected: A `kurnik-sopa-postgres-1` (or similar) container is `Up`. If not, debug docker before proceeding.

- [ ] **Step 1b: Ensure `payload-types.ts` exists locally**

```bash
npx payload generate:types
ls src/payload-types.ts
```

`payload-types.ts` is gitignored (per memory `payload_types_gitignored`); the factories in this task import from `@/payload-types`, so the file must be present. CI regenerates it explicitly; locally, this command does the same.

- [ ] **Step 2: Install `pg` for the DB safety guard / drop+create**

```bash
npm install --save-dev --legacy-peer-deps pg @types/pg
```

This is a *direct* dependency of the test setup (not transitively via Payload), so it needs to be explicit.

- [ ] **Step 3: Create `tests/setup/email-spy.ts`**

```ts
type Captured = {
  to: string
  from?: string
  subject: string
  html?: string
  text?: string
  attachments?: unknown[]
  replyTo?: string
}

export const capturedEmails: Captured[] = []

export const resetEmails = () => {
  capturedEmails.length = 0
}

export const emailSpyAdapter = () => ({
  name: 'spy',
  defaultFromAddress: 'spy@test.local',
  defaultFromName: 'Test',
  sendEmail: async (message: Captured) => {
    capturedEmails.push(message)
    return { id: `spy-${capturedEmails.length}` }
  },
})
```

- [ ] **Step 4: Create `tests/setup/global-setup.ts`**

```ts
import { Client } from 'pg'
import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.test') })

function parseDbName(uri: string): { adminUri: string; dbName: string } {
  const url = new URL(uri)
  const dbName = url.pathname.replace(/^\//, '')
  url.pathname = '/postgres'
  return { adminUri: url.toString(), dbName }
}

export default async function setup() {
  const uri = process.env.DATABASE_URI
  if (!uri) throw new Error('DATABASE_URI is not set — check .env.test')

  const { adminUri, dbName } = parseDbName(uri)

  // SAFETY GUARD — non-negotiable.
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". The DB name must end in "_test".`,
    )
  }

  // Drop + recreate.
  const admin = new Client({ connectionString: adminUri })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
  await admin.query(`CREATE DATABASE "${dbName}"`)
  await admin.end()

  // Apply migrations via shell-out — same path Vercel uses.
  const result = spawnSync('npx', ['payload', 'migrate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URI: uri },
  })
  if (result.status !== 0) {
    throw new Error(`payload migrate failed with exit code ${result.status}`)
  }

  // Vitest teardown — drop the DB on clean shutdown.
  return async () => {
    const cleanup = new Client({ connectionString: adminUri })
    await cleanup.connect()
    await cleanup.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {})
    await cleanup.end()
  }
}
```

- [ ] **Step 5: Create `tests/setup/reset-db.ts`**

```ts
import { Client } from 'pg'

const TABLES = [
  'orders',
  'carts',
  'users',
  'products',
  'product_categories',
  'media',
  'posts',
  'post_categories',
  'authors',
  'events',
  'event_registrations',
  'pages',
]

let client: Client | null = null

async function getClient(): Promise<Client> {
  if (client) return client
  const uri = process.env.DATABASE_URI
  if (!uri) throw new Error('DATABASE_URI not set')
  client = new Client({ connectionString: uri })
  await client.connect()
  return client
}

export async function resetDb(): Promise<void> {
  const c = await getClient()
  const quoted = TABLES.map(t => `"${t}"`).join(', ')
  await c.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
}
```

Note on the table list: this matches the 12 collections under `src/collections/`. If `payload migrate` creates sibling tables (e.g. `orders_items`, `users_addresses`) that hold child rows, the `CASCADE` should clear them transitively. If integration tests show stale child rows after `resetDb`, add the offending sibling tables here.

- [ ] **Step 6: Create `tests/helpers/payload.ts`**

```ts
import baseConfig from '@payload-config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import { emailSpyAdapter } from '../setup/email-spy'

let cached: Payload | null = null

export async function getTestPayload(): Promise<Payload> {
  if (cached) return cached
  const resolved = await baseConfig
  const config = { ...resolved, email: emailSpyAdapter() }
  cached = await getPayload({ config })
  return cached
}
```

- [ ] **Step 7: Create `tests/helpers/factories.ts`**

```ts
import type { Payload } from 'payload'
import type { Cart, Product, User } from '@/payload-types'

let userCounter = 0
let productCounter = 0

export async function createTestUser(
  payload: Payload,
  overrides: Partial<{
    email: string
    password: string
    role: 'admin' | 'staff' | 'customer'
    firstName: string
    lastName: string
    phone: string
  }> = {},
): Promise<User> {
  userCounter += 1
  return payload.create({
    collection: 'users',
    data: {
      email: overrides.email ?? `test-user-${userCounter}@kurnik-sopa.cz`,
      password: overrides.password ?? 'test-password-min-8',
      role: overrides.role ?? 'customer',
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? `User${userCounter}`,
      phone: overrides.phone ?? '+420123456789',
      _verified: true,
    } as Parameters<Payload['create']>[0]['data'],
  })
}

export async function createTestProduct(
  payload: Payload,
  overrides: Partial<{
    name: string
    slug: string
    price: number
    unit: 'kg' | 'ks' | 'l' | 'balení'
    inStock: boolean
    stockQuantity: number | null
    minimumOrder: number | null
    seasonal: boolean
    availableFrom: string | null
    availableTo: string | null
    status: 'draft' | 'published'
  }> = {},
): Promise<Product> {
  productCounter += 1
  return payload.create({
    collection: 'products',
    data: {
      name: overrides.name ?? `Test Product ${productCounter}`,
      slug: overrides.slug ?? `test-product-${productCounter}`,
      price: overrides.price ?? 100,
      unit: overrides.unit ?? 'ks',
      inStock: overrides.inStock ?? true,
      stockQuantity: overrides.stockQuantity ?? 100,
      minimumOrder: overrides.minimumOrder ?? null,
      seasonal: overrides.seasonal ?? false,
      availableFrom: overrides.availableFrom ?? null,
      availableTo: overrides.availableTo ?? null,
      status: overrides.status ?? 'published',
    } as Parameters<Payload['create']>[0]['data'],
  })
}

export async function setTestSiteSettings(payload: Payload): Promise<void> {
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      farmName: 'Kurník Šopa (test)',
      contact: { phone: '+420123456789', email: 'test@kurnik-sopa.cz' },
      address: { street: 'Test 1', city: 'Praha', zip: '11000' },
      notificationEmail: 'staff@kurnik-sopa.cz',
      payment: {
        bankName: 'KB',
        accountPrefix: '',
        accountNumber: '2901234567',
        bankCode: '2010',
      },
      owner: 'Test Owner',
    } as Parameters<Payload['updateGlobal']>[0]['data'],
  })
}

export async function createTestCart(
  payload: Payload,
  user: User,
  items: Array<{ product: Product; quantity: number }>,
): Promise<Cart> {
  return payload.create({
    collection: 'carts',
    data: {
      user: user.id,
      items: items.map(it => ({ product: it.product.id, quantity: it.quantity })),
    } as Parameters<Payload['create']>[0]['data'],
  })
}
```

If the `Users` collection rejects `_verified` on create, drop that line — Payload may handle verification differently in v3.84. The factory will still work; tests just won't be able to log in via the API (which they don't need, since they call Local API directly).

- [ ] **Step 8: Create `tests/integration/cart/get-or-create-cart.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'

describe('getOrCreateCart', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('creates a cart on first call for a user', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const cart = await getOrCreateCart(payload, user.id as number)
    expect(cart.id).toBeDefined()
    expect((typeof cart.user === 'object' ? cart.user.id : cart.user)).toBe(user.id)
  })

  it('returns the same cart on subsequent calls (idempotent)', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const first = await getOrCreateCart(payload, user.id as number)
    const second = await getOrCreateCart(payload, user.id as number)
    expect(second.id).toBe(first.id)
  })

  it('returns different carts for different users', async () => {
    const payload = await getTestPayload()
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    const cartA = await getOrCreateCart(payload, a.id as number)
    const cartB = await getOrCreateCart(payload, b.id as number)
    expect(cartA.id).not.toBe(cartB.id)
  })
})
```

- [ ] **Step 9: Run integration tests for the first time**

```bash
npm test -- --project integration
```

Expected:
1. `payload migrate` runs once (visible output), takes ~3-5s.
2. All 3 cart tests PASS.
3. On exit, the test DB is dropped.

Common failure modes:
- **"Refusing to run tests against ..."** — `.env.test` `DATABASE_URI` doesn't end in `_test`. Fix it.
- **"connect ECONNREFUSED"** — Postgres isn't running. `docker-compose up -d`.
- **"function getOrCreateCart is not defined"** — check signature of `src/lib/cart/getOrCreateCart.ts`. The test assumes `(payload, userId) => Cart`. If different, adjust the test, not the source.
- **`@payload-config` not found** — recheck `vitest.config.ts` alias.

- [ ] **Step 10: Run the full suite**

```bash
npm test
```

Expected: 16 unit tests + 3 integration tests pass. Total run < 15s on warm cache.

- [ ] **Step 11: Suggested commit (user runs)**

```
git add tests/setup/ tests/helpers/ tests/integration/cart/ package.json package-lock.json
git commit -m "test: add integration harness (DB lifecycle, email spy, helpers, factories) + cart tests"
```

---

## Task 6: Order placement — happy paths

**Files:**
- Create: `repo/tests/integration/orders/place-order.test.ts`

Reference source: `repo/src/lib/orders/placeOrder.ts`.

This task adds the happy-path tests only. Validation rejections are Task 7.

- [ ] **Step 1: Write the happy-path tests**

Create `repo/tests/integration/orders/place-order.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import {
  createTestUser,
  createTestProduct,
  createTestCart,
  setTestSiteSettings,
} from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails, capturedEmails } from '../../setup/email-spy'
import { placeOrder } from '@/lib/orders/placeOrder'

describe('placeOrder — happy paths', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  it('places a bank_transfer order with QR, snapshots prices, sends 2 emails, clears cart', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { price: 250 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 3 }])

    const result = await placeOrder(payload, {
      user,
      cart,
      locale: 'cs',
      customer: { firstName: 'Jan', lastName: 'Novák', phone: '+420123456789' },
      deliveryMethod: 'pickup',
      preferredDate: '2026-06-01',
      paymentMethod: 'bank_transfer',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return // type narrow
    expect(result.orderNumber).toMatch(/^2026\d{8}$/)

    // Order persisted with snapshot prices
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs).toHaveLength(1)
    const order = orders.docs[0]
    expect(order.totalAmount).toBe(750)
    expect(order.items?.[0]?.priceAtPurchase).toBe(250)
    expect(order.qrSpayd).toContain('SPD*1.0')
    expect(order.qrSpayd).toContain('AM:750.00')

    // Cart deleted
    const carts = await payload.find({ collection: 'carts', limit: 1 })
    expect(carts.docs).toHaveLength(0)

    // Two emails: customer + staff
    expect(capturedEmails).toHaveLength(2)
    expect(capturedEmails[0].subject).toContain(result.orderNumber)
    expect(capturedEmails[0].attachments?.[0]).toMatchObject({ cid: 'order-qr' })
    expect(capturedEmails[1].to).toBe('staff@kurnik-sopa.cz')
  })

  it('places a cash_on_delivery order without QR or attachment', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { price: 100 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 2 }])

    const result = await placeOrder(payload, {
      user,
      cart,
      locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '+420...' },
      deliveryMethod: 'pickup',
      preferredDate: '2026-06-01',
      paymentMethod: 'cash_on_delivery',
    })

    expect(result.ok).toBe(true)
    const orders = await payload.find({ collection: 'orders', limit: 1 })
    expect(orders.docs[0].qrSpayd).toBeFalsy()
    expect(capturedEmails[0].attachments).toBeFalsy()
  })

  it('persists deliveryAddress only when deliveryMethod is delivery', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])

    const result = await placeOrder(payload, {
      user,
      cart,
      locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '+420...' },
      deliveryMethod: 'delivery',
      deliveryAddress: { street: 'Lipová 5', city: 'Brno', zip: '60200' },
      preferredDate: '2026-06-01',
      paymentMethod: 'bank_transfer',
    })

    expect(result.ok).toBe(true)
    const order = (await payload.find({ collection: 'orders', limit: 1 })).docs[0]
    expect(order.deliveryAddress?.city).toBe('Brno')
  })

  it('generates sequential year-based order numbers', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)

    const cart1 = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const r1 = await placeOrder(payload, {
      user, cart: cart1, locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '' },
      deliveryMethod: 'pickup', preferredDate: '2026-06-01',
      paymentMethod: 'cash_on_delivery',
    })
    expect(r1.ok).toBe(true)
    if (!r1.ok) return

    const cart2 = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const r2 = await placeOrder(payload, {
      user, cart: cart2, locale: 'cs',
      customer: { firstName: 'A', lastName: 'B', phone: '' },
      deliveryMethod: 'pickup', preferredDate: '2026-06-01',
      paymentMethod: 'cash_on_delivery',
    })
    expect(r2.ok).toBe(true)
    if (!r2.ok) return

    // Expect 202600000001 → 202600000002
    expect(parseInt(r2.orderNumber, 10)).toBe(parseInt(r1.orderNumber, 10) + 1)
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project integration tests/integration/orders/place-order.test.ts
```

Expected: 4 tests PASS.

Common failure modes:
- **`SiteSettings.payment.accountNumber` is required** — check `setTestSiteSettings` in `factories.ts`; the values may not match SiteSettings field shape. Adjust factory.
- **`payload.create({ collection: 'orders', ... })` rejects** — Orders collection may have required fields not set by `placeOrder`. Read `src/collections/Orders/index.ts` and fix factory or the test setup.
- **Order number is not `202600000001`** — check `src/lib/orders/orderNumber.ts` for the actual format and adjust the regex.

- [ ] **Step 3: Suggested commit (user runs)**

```
git add tests/integration/orders/place-order.test.ts
git commit -m "test(orders): cover placeOrder happy paths (bank/cash, delivery, sequencing)"
```

---

## Task 7: Order placement — validation rejections

**Files:**
- Modify: `repo/tests/integration/orders/place-order.test.ts` (append a second `describe` block)

- [ ] **Step 1: Append rejection tests to the existing file**

Add this block AFTER the existing `describe('placeOrder — happy paths', ...)`:

```ts
describe('placeOrder — validation rejections', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
    const payload = await getTestPayload()
    await setTestSiteSettings(payload)
  })

  const baseInput = (overrides: Record<string, unknown> = {}) => ({
    locale: 'cs' as const,
    customer: { firstName: 'A', lastName: 'B', phone: '' },
    deliveryMethod: 'pickup' as const,
    preferredDate: '2026-06-01',
    paymentMethod: 'cash_on_delivery' as const,
    ...overrides,
  })

  it('rejects an empty cart with reason cartEmpty', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const cart = await createTestCart(payload, user, [])
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('cartEmpty')
    expect(capturedEmails).toHaveLength(0)
  })

  it('rejects when product is not found', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    // Delete the product so the cart points at a missing id.
    await payload.delete({ collection: 'products', id: product.id })

    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('productNotFound')
  })

  it('rejects out-of-stock product', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { inStock: false })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('outOfStock')
  })

  it('rejects insufficient stock', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { stockQuantity: 2 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 5 }])
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('insufficientStock')
  })

  it('rejects below minimum order with min populated', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const product = await createTestProduct(payload, { minimumOrder: 5 })
    const cart = await createTestCart(payload, user, [{ product, quantity: 2 }])
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('belowMinimumOrder')
    expect(result.errors[0].min).toBe(5)
  })

  it('rejects seasonal product outside its window', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    // Window in the past so today is outside it.
    const product = await createTestProduct(payload, {
      seasonal: true,
      availableFrom: '2020-01-01',
      availableTo:   '2020-12-31',
    })
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const result = await placeOrder(payload, { user, cart, ...baseInput() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('outOfSeason')
  })

  it('rejects bank_transfer when SiteSettings.payment.accountNumber is missing', async () => {
    const payload = await getTestPayload()
    // Wipe payment config.
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { payment: null } as Parameters<typeof payload.updateGlobal>[0]['data'],
    })

    const user = await createTestUser(payload)
    const product = await createTestProduct(payload)
    const cart = await createTestCart(payload, user, [{ product, quantity: 1 }])
    const result = await placeOrder(payload, {
      user, cart,
      ...baseInput({ paymentMethod: 'bank_transfer' }),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('paymentMethodMissingBankDetails')
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project integration tests/integration/orders/place-order.test.ts
```

Expected: 11 tests PASS (4 happy + 7 rejection).

- [ ] **Step 3: Suggested commit (user runs)**

```
git add tests/integration/orders/place-order.test.ts
git commit -m "test(orders): cover placeOrder validation rejections (stock, season, bank cfg)"
```

---

## Task 8: Access control — Users

**Files:**
- Create: `repo/tests/integration/access-control/users.test.ts`

Reference source: `repo/src/collections/Users/index.ts` (`access` block).

- [ ] **Step 1: Write the test file**

Create `repo/tests/integration/access-control/users.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('Users access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a user can read their own User doc', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const result = await payload.find({
      collection: 'users',
      where: { id: { equals: user.id } },
      user,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(1)
  })

  it('a user cannot read another user’s doc', async () => {
    const payload = await getTestPayload()
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    const result = await payload.find({
      collection: 'users',
      where: { id: { equals: b.id } },
      user: a,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(0)
  })

  it('a user cannot update their own role', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload, { role: 'customer' })
    await expect(
      payload.update({
        collection: 'users',
        id: user.id,
        data: { role: 'admin' } as Parameters<typeof payload.update>[0]['data'],
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a user cannot update their own email', async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    await expect(
      payload.update({
        collection: 'users',
        id: user.id,
        data: { email: 'hijacked@kurnik-sopa.cz' } as Parameters<typeof payload.update>[0]['data'],
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('an admin can update another user’s role', async () => {
    const payload = await getTestPayload()
    const admin = await createTestUser(payload, { role: 'admin' })
    const target = await createTestUser(payload, { role: 'customer' })
    const result = await payload.update({
      collection: 'users',
      id: target.id,
      data: { role: 'staff' } as Parameters<typeof payload.update>[0]['data'],
      user: admin,
      overrideAccess: false,
    })
    expect(result.role).toBe('staff')
  })
})
```

If access control returns `null` / empty instead of throwing on a forbidden update, change `rejects.toThrow()` to the actual behavior after reading `src/collections/Users/index.ts:access`.

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project integration tests/integration/access-control/users.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 3: Suggested commit (user runs)**

```
git add tests/integration/access-control/users.test.ts
git commit -m "test(access): Users — ownership read, role/email admin-only update"
```

---

## Task 9: Access control — Orders

**Files:**
- Create: `repo/tests/integration/access-control/orders.test.ts`

Reference source: `repo/src/collections/Orders/index.ts`.

- [ ] **Step 1: Write the test file**

Create `repo/tests/integration/access-control/orders.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, createTestProduct } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'
import type { Order, Product, User } from '@/payload-types'

async function seedOrder(opts: { customer: User; product: Product }): Promise<Order> {
  const payload = await getTestPayload()
  return payload.create({
    collection: 'orders',
    data: {
      orderNumber: '202600000099',
      customer: opts.customer.id,
      items: [{ product: opts.product.id, quantity: 1, priceAtPurchase: opts.product.price }],
      totalAmount: opts.product.price,
      deliveryMethod: 'pickup',
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      orderStatus: 'received',
      preferredDate: '2026-06-01',
      locale: 'cs',
    } as Parameters<typeof payload.create>[0]['data'],
  })
}

describe('Orders access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a customer can read only their own orders', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customerA = await createTestUser(payload)
    const customerB = await createTestUser(payload)
    await seedOrder({ customer: customerA, product })
    await seedOrder({ customer: customerB, product })

    const result = await payload.find({
      collection: 'orders',
      user: customerA,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(1)
    const ownerId = typeof result.docs[0].customer === 'object'
      ? result.docs[0].customer.id : result.docs[0].customer
    expect(ownerId).toBe(customerA.id)
  })

  it('a customer cannot mutate paymentStatus or orderStatus', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customer = await createTestUser(payload)
    const order = await seedOrder({ customer, product })
    await expect(
      payload.update({
        collection: 'orders',
        id: order.id,
        data: { paymentStatus: 'paid' } as Parameters<typeof payload.update>[0]['data'],
        user: customer,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a staff user can update paymentStatus, orderStatus, notes — and only those', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customer = await createTestUser(payload)
    const staff = await createTestUser(payload, { role: 'staff' })
    const order = await seedOrder({ customer, product })

    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        paymentStatus: 'paid',
        orderStatus: 'shipped',
        notes: 'picked up',
      } as Parameters<typeof payload.update>[0]['data'],
      user: staff,
      overrideAccess: false,
    })
    expect(updated.paymentStatus).toBe('paid')
    expect(updated.orderStatus).toBe('shipped')

    // Staff must NOT be able to change totalAmount or customer.
    await expect(
      payload.update({
        collection: 'orders',
        id: order.id,
        data: { totalAmount: 0 } as Parameters<typeof payload.update>[0]['data'],
        user: staff,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('an admin can update any field', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const customer = await createTestUser(payload)
    const admin = await createTestUser(payload, { role: 'admin' })
    const order = await seedOrder({ customer, product })

    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: { totalAmount: 999 } as Parameters<typeof payload.update>[0]['data'],
      user: admin,
      overrideAccess: false,
    })
    expect(updated.totalAmount).toBe(999)
  })
})
```

If the staff field-level lock doesn't throw but silently ignores forbidden fields, replace `rejects.toThrow()` with a re-read and assert the field didn't change. Read `src/collections/Orders/index.ts` to confirm which behavior is implemented.

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project integration tests/integration/access-control/orders.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 3: Suggested commit (user runs)**

```
git add tests/integration/access-control/orders.test.ts
git commit -m "test(access): Orders — customer read-own, staff field locks, admin override"
```

---

## Task 10: Access control — Carts

**Files:**
- Create: `repo/tests/integration/access-control/carts.test.ts`

Reference source: `repo/src/collections/Carts/index.ts`.

- [ ] **Step 1: Write the test file**

Create `repo/tests/integration/access-control/carts.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestPayload } from '../../helpers/payload'
import { createTestUser, createTestProduct, createTestCart } from '../../helpers/factories'
import { resetDb } from '../../setup/reset-db'
import { resetEmails } from '../../setup/email-spy'

describe('Carts access control', () => {
  beforeEach(async () => {
    await resetDb()
    resetEmails()
  })

  it('a user can read their own cart', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const user = await createTestUser(payload)
    await createTestCart(payload, user, [{ product, quantity: 1 }])

    const result = await payload.find({
      collection: 'carts',
      user,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(1)
  })

  it('a user cannot read another user’s cart', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const a = await createTestUser(payload)
    const b = await createTestUser(payload)
    await createTestCart(payload, b, [{ product, quantity: 1 }])

    const result = await payload.find({
      collection: 'carts',
      user: a,
      overrideAccess: false,
    })
    expect(result.docs).toHaveLength(0)
  })

  it('one row per user is enforced (second create either returns existing or errors)', async () => {
    const payload = await getTestPayload()
    const product = await createTestProduct(payload)
    const user = await createTestUser(payload)
    await createTestCart(payload, user, [{ product, quantity: 1 }])

    // Attempt a second create for the same user. Implementation may either reject
    // or upsert. Either way, the row count must stay at 1.
    try {
      await createTestCart(payload, user, [{ product, quantity: 2 }])
    } catch { /* acceptable */ }

    const all = await payload.find({ collection: 'carts', limit: 10 })
    expect(all.docs).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npm test -- --project integration tests/integration/access-control/carts.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 3: Run the full integration suite**

```bash
npm test -- --project integration
```

Expected: 3 + 11 + 5 + 4 + 3 = **26 integration tests** pass. Run takes ~30-60s including migrate.

- [ ] **Step 4: Run the entire suite**

```bash
npm test
```

Expected: 16 unit + 26 integration = **42 tests** pass.

(The spec estimated ~36; the actual count is slightly higher because some `describe` blocks ended up with one more case than estimated. That's fine — the spec said "~30" as a ballpark.)

- [ ] **Step 5: Suggested commit (user runs)**

```
git add tests/integration/access-control/carts.test.ts
git commit -m "test(access): Carts — ownership read, one row per user"
```

---

## Task 11: GitHub Actions CI

**Files:**
- Create: `repo/.github/workflows/test.yml`

- [ ] **Step 1: Create the workflow**

Create `repo/.github/workflows/test.yml`:

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
        ports:
          - 5432:5432
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

**Path note:** the git root is `repo/` (verified via `git rev-parse --show-toplevel` from the project). GitHub Actions checks out the git root, so `actions/checkout` lands at what is locally `repo/`, and `package.json` / `.nvmrc` / `.github/` are all at the workflow's working directory. No `working-directory` override or path prefix is needed.

- [ ] **Step 2: Push a branch and open a draft PR to see CI run**

```bash
git checkout -b feature/phase-4-test-framework
git push -u origin feature/phase-4-test-framework
# Then on GitHub: open a draft PR. The `test` workflow should appear in the checks list.
```

Expected: CI starts, sets up Postgres, installs deps, generates types, runs tests, exits 0.

If CI fails because `repo/` paths are wrong, fix `working-directory` and `cache-dependency-path` in the workflow and push again.

- [ ] **Step 3: Suggested commit (user runs)**

(Already committed if you pushed in Step 2. If the workflow needed a fix, commit the fix:)
```
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions workflow for test on push and PR"
```

---

## Task 12: README + final verification

**Files:**
- Modify: `repo/README.md`

- [ ] **Step 1: Add a "Running tests" section to the README**

Find the existing run/build section in `repo/README.md` and append (or add a new top-level section):

```markdown
## Running tests

The repo uses Vitest with two projects: `unit` (pure functions, no DB) and `integration` (real Postgres via Payload Local API).

```bash
# All tests (requires docker-compose Postgres running)
npm test

# Unit tests only (no Postgres needed)
npm test -- --project unit

# Watch mode
npm run test:watch
```

The integration suite uses a separate database `kurnik_sopa_test` on the same local Postgres as dev (`kurnik_sopa`). It is dropped and recreated at the start of each run; **running tests does not affect dev data**.

CI runs both suites against a fresh Postgres on every push and PR — see `.github/workflows/test.yml`.
```

- [ ] **Step 2: Verify a checkout from `main` still passes the suite**

This confirms the tests gate against already-shipped code, not just this branch.

```bash
git stash             # stash uncommitted edits if any
git checkout main
npm test
git checkout feature/phase-4-test-framework
git stash pop
```

Expected: same 42 passes. If tests added in this PR fail against `main`, the test was wrong (the shipped code passed manual verification on 2026-05-18). Fix the test, not the source.

Note: the tests are *defined* on the feature branch and won't exist on `main`. To verify the *coverage targets work on main*, you'd need to cherry-pick the test files onto a temporary branch off `main`. Optional — skip if time-boxed.

- [ ] **Step 3: Mark the PR ready for review**

After CI is green, move the PR from draft to ready. PR description should include:

```markdown
## Summary
- Vitest harness with `unit` and `integration` projects.
- 16 unit tests (SPAYD / IBAN / QR).
- 26 integration tests (cart, order placement happy + rejections, access control on Users/Orders/Carts).
- GitHub Actions workflow gates merge on green tests.

## Manual steps after merge
- Enable branch protection: Settings → Branches → require the `test` check before merging to `main`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 4: Suggested commit (user runs)**

```
git add README.md
git commit -m "docs: add Running tests section"
```

---

## Done state

After all tasks:

- `npm test` passes locally with 42 tests across 8 files.
- `npm test -- --project unit` passes without Docker.
- GitHub Actions runs the full suite on every push and PR.
- Spec § 11 deliverables 1-9 are complete.
- Spec § 13 follow-ups remain open (email snapshots, order number unit test, Playwright, coverage, branch protection automation).

## Spec coverage check

| Spec section | Task |
|---|---|
| §3 file layout | 1, 5 (most created across tasks) |
| §4 dependencies (vitest) | 1 |
| §5 npm scripts | 1 |
| §6.1 globalSetup | 5 |
| §6.2 resetDb | 5 |
| §6.3 per-test helper | 5 |
| §7 email spy | 5 |
| §8.1 spayd tests | 2 |
| §8.2 iban tests | 3 |
| §8.3 qr tests | 4 |
| §8.4 place-order tests | 6, 7 |
| §8.5 cart tests | 5 |
| §8.6 access-control tests | 8, 9, 10 |
| §9 CI workflow | 11 |
| §10 .env.test | 1 |
| §11 deliverables | (verify at task 12) |
| §12 verification plan | 12 |
