# Kurník & Šopa

> Regenerativní farma v Křepicích u Hustopečí — a small regenerative farm in South Moravia, Czech Republic, raising pastured poultry, geese, rabbits, and growing seasonal vegetables.

**Live site:** [kurnik-sopa.cz](https://kurnik-sopa.cz) · [dev.kurnik-sopa.cz](https://dev.kurnik-sopa.cz)

This repo is the farm's bilingual (Czech / English) e-shop and content site.

## What's on the site

- 🐔 **Farm products** — pastured chicken, eggs, geese, rabbits, vegetables, dairy, honey, preserves. Seasonal availability, real-time stock.
- 🎓 **Workshops & events** — schedule, capacity, on-site registration.
- 📖 **Blog & news** — what's growing, what's coming to the farm shop.
- 🛒 **Cart + checkout** — guest or registered, with QR Platba (Czech bank transfer) and cash on pickup/delivery.
- 📬 **Order tracking** — automatic email confirmations with embedded QR code; logged-in customers see full order history at `/cs/ucet/objednavky`.
- 🇨🇿🇬🇧 **Czech and English** — full storefront in both languages.
- ♿ **Accessible, mobile-first** — WCAG 2.1 AA targets, fast on phones (where most of our customers shop).
- 🍪 **GDPR-compliant cookie consent** — opt-in for analytics / marketing, gated through Google Tag Manager.

## Tech (for the curious)

| Layer | Stack |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| CMS / backend | Payload CMS v3 — runs in-process inside Next.js |
| Database | PostgreSQL (Neon, Frankfurt) |
| Styling | Tailwind CSS 4 |
| i18n | next-intl (CZ default, EN alternate) |
| Media | Cloudflare R2 |
| Email | Resend |
| Analytics | Google Tag Manager + GA4 (Consent Mode v2) |
| Hosting | Vercel (fra1) |
| Tests | Vitest (unit + integration against real Postgres) + GitHub Actions CI |

One repo, one process: storefront, admin panel (`/admin`), and the REST/GraphQL API all share the same origin.

## Local development

Prerequisites: **Node 22.x** (`.nvmrc` is pinned), **npm**, **Docker** for Postgres.

```bash
# Start local Postgres
docker-compose up -d

# Install deps
npm install

# Set up env
cp .env.example .env
# Edit .env — at minimum set PAYLOAD_SECRET (any 32+ char string) and DATABASE_URI

# Run dev server
npm run dev
```

- Storefront: <http://localhost:3000>
- Admin panel: <http://localhost:3000/admin>

### Common scripts

```bash
npm run dev                 # Next + Payload, hot reload
npm run build               # Production build
npm run generate:types      # Regenerate payload-types.ts (after editing collections)
npm run generate:importmap  # Regenerate admin importMap.js (after custom admin components)
npx payload migrate:create  # New migration from collection diffs
npx payload migrate         # Apply pending migrations
npm run seed                # Seed dev data
```

## Running tests

Vitest with two projects: `unit` (pure functions, no DB) and `integration` (real Postgres via Payload Local API).

```bash
# All tests (requires docker-compose Postgres running)
npm test

# Unit only — no Postgres needed
npm test -- --project unit

# Watch mode
npm run test:watch
```

The integration suite uses a separate `kurnik_sopa_test` database on the same local Postgres as dev — it's dropped and recreated at the start of each run, so **running tests does not affect dev data**.

CI runs both suites on every push and PR — see `.github/workflows/test.yml`.

## Deployment

The site runs on **Vercel** (region `fra1`), with **Neon** Postgres in Frankfurt for production data and **Cloudflare R2** (`kurnik-sopa-media` bucket) for uploaded media. Transactional email is handled by **Resend** from the verified `kurnik-sopa.cz` domain.

### Required environment variables

Set these in the Vercel **Production** environment scope. Note: Vercel env vars only take effect on **new** deployments — after changing any of them, trigger a redeploy.

| Variable | Purpose |
|---|---|
| `DATABASE_URI` | Postgres connection string (Neon) |
| `PAYLOAD_SECRET` | 32+ char random string for Payload session signing |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://kurnik-sopa.cz`, used in absolute URLs in emails |
| `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Cloudflare R2 credentials. Bucket must exist before first deploy — empty `S3_BUCKET` causes the storage adapter to silently fall back to local disk and crash on Vercel. |
| `RESEND_API_KEY` | Resend API key. Empty in local dev → Payload's console logger is used. |
| `EMAIL_FROM` | FROM address for transactional email; the domain must be verified in Resend. |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager container ID (`GTM-XXXXXX`). Empty disables GTM/GA loading. GA4 is configured **inside** the GTM container. |

Database migrations live in `src/migrations/` and **must be committed** — Vercel runs them on each deploy.

The admin import map (`src/app/(payload)/admin/importMap.js`) must be regenerated and committed whenever custom admin components change, otherwise production admin breaks.

## Project structure

```
src/
├── app/
│   ├── (frontend)/[locale]/   # Public storefront — locale-prefixed routes
│   ├── (payload)/admin/        # Payload admin panel
│   └── api/                    # REST + GraphQL API
├── collections/                # Payload collection configs (Products, Orders, …)
├── globals/                    # Payload globals (SiteSettings, Navigation, …)
├── components/                 # React components by feature
├── lib/                        # Payload helpers, i18n, utils, payment, orders, cart
├── migrations/                 # SQL migrations — committed
└── payload.config.ts           # Main Payload config

messages/cs.json, messages/en.json   # next-intl UI strings
docs/superpowers/specs/              # Design specs (per feature)
docs/superpowers/plans/              # Implementation plans (per feature)
tests/unit/ tests/integration/       # Vitest suites
```

## License

Source-available, all rights reserved. Not for redistribution.
