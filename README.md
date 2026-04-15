# Kurník & Šopa — Regenerativní farma / E-shop

Bilingual (CZ/EN) e-commerce website for a Czech regenerative farm selling pastured poultry, eggs, geese, rabbits, and vegetables.

## Tech Stack

- **CMS / Backend:** Payload CMS v3 (runs inside Next.js)
- **Frontend:** Next.js 15 (App Router, React Server Components)
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL (via `@payloadcms/db-postgres`)
- **i18n:** next-intl (CZ/EN)
- **Payments:** Stripe (Phase 1)

## Getting Started

```bash
# Prerequisites: Node 20+, pnpm, Docker

# Start PostgreSQL
docker-compose up -d

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your PAYLOAD_SECRET and DATABASE_URI

# Run dev server
pnpm dev
```

Admin panel: `http://localhost:3000/admin`
Storefront: `http://localhost:3000`

## Project Structure

```
src/
├── app/(frontend)/[locale]/  # Public storefront (cs/en routes)
├── app/(payload)/admin/       # Payload admin panel
├── app/api/                   # REST + GraphQL API
├── collections/               # Payload collection configs
├── globals/                   # Payload globals
├── components/                # React components
├── lib/i18n/                  # i18n config + routing
└── payload.config.ts          # Main Payload config
```
