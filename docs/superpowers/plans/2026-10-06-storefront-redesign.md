# Storefront Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the storefront's look per `docs/superpowers/specs/2026-10-03-storefront-redesign-design.md` — light palette, new shell, new page layouts.

**Architecture:** A semantic colour-token layer in `src/app/globals.css` with the old `brand-*` names aliased onto it, so every route stays readable while pages move over. Shared presentational pieces live in `src/components/ui/` and `src/components/illustrations/`; pages compose them as Server Components using the Payload Local API.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS 4 (`@theme` tokens), Payload 3.84 Local API, next-intl, Vitest 4.

**Deviation from the spec's sequencing (decided 2026-10-06):** the user wants to see the design early, so PR A carries the foundation, the shell *and the homepage*; PR B carries the remaining public pages and the alias clean-up. T2-6 (scheduled publishing) is merged, so the homepage news block (T2-8) is built here on `publishedPostsWhere`, and blog images move to `next/image` (T2-9) in PR B.

**Execution note:** this plan is executed in the same session that wrote it, so code lives in the commits rather than being duplicated here. Each task lists files, the decision that matters, and how it is verified.

---

## PR A — foundation, shell, homepage

### Task A1: Colour tokens and legacy aliases

**Files:** Modify `src/app/globals.css`, `src/app/(frontend)/[locale]/layout.tsx`. Delete `public/body-bg.svg`. Test: `tests/unit/design/contrast.test.ts`.

- [ ] Write `contrast.test.ts`: parse the `@theme` block of `globals.css`, assert every text/ground pair in spec §1 is ≥ 4.5:1 and `accent` on `ground` is < 4.5:1. Run it — fails (tokens absent).
- [ ] Add the ten tokens (`ground`, `ground-sunken`, `ink`, `ink-muted` = `#456766`, `ink-deep`, `accent`, `accent-strong`, `panel-blush`, `panel-sage`, `line`) and the legacy aliases from spec §1 (`brand-cream` → `ground-sunken`, etc.). Body ground/ink; remove `body-bg.svg`; delete the `prose-invert` overrides and the unlayered `.bg-white` hacks; add unlayered `.prose` colour variables and a `:focus-visible` outline (unlayered — see the Tailwind v4 cascade-layer note in memory).
- [ ] Run the test — passes.

### Task A2: Light-text pass on routes keeping their layout

Every `text-brand-cream` / `border-brand-cream` / `text-brand-gold` / `prose-invert` that is not on a dark fill becomes an `ink` / `ink-muted` / `border-ink` class (list in the session log, 25 lines in 14 files). Dark chips (`bg-brand-green-deep text-brand-cream`) stay: they map to `ink-deep` on `ground-sunken` and read fine.

- [ ] Verify: `grep -rn "prose-invert\|text-brand-gold" src` → nothing.

### Task A3: UI primitives

**Files:** `src/components/ui/button.ts` (`buttonClass(variant, size)`), `SectionHeading.tsx`, `Badge.tsx`, `DateBlock.tsx`. Test: `tests/unit/ui/button.test.ts` (variant classes, unknown size falls back).

### Task A4: Illustrations

**Files:** `src/components/illustrations/Illustration.tsx` (+ one glyph per name: chicken, hen, eggs, rabbit, goose, vegetables, microgreens, scene), `category-map.ts`. Test: `tests/unit/illustrations/category-map.test.ts` (each seeded slug resolves; unknown → `hen`).

### Task A5: Shell

**Files:** `src/components/layout/Logo.tsx` (inline SVG from `public/logo-kurnik-sopa.svg`, `currentColor`), `NavLinks.tsx` (client, `aria-current`), `MobileNav.tsx` (client, native `<dialog>`), `Header.tsx` (server), `HeaderUserMenu.tsx` (login link when signed out), `Footer.tsx` (async, SiteSettings), `CartBadge.tsx` (SVG icon, count in accessible name), `Toaster.tsx`, `cookieconsent-overrides.css`, locale layout (skip link, `id="main"`). Recolour `public/logo-kurnik-sopa.svg` to `#285A5B` (used by JSON-LD).

### Task A6: Homepage

**Files:** `src/app/(frontend)/[locale]/page.tsx`, `src/components/products/ProductCard.tsx`, `src/components/blog/PostCard.tsx`, `src/lib/utils.ts` (`formatPrice` reused), `messages/cs.json`, `messages/en.json`. Test: `tests/unit/utils/format.test.ts` (`formatPrice(1250)` → `1 250 Kč` with a non-breaking space).

Blocks per spec §5: hero + scene, three panels, what-we-raise, featured products (omitted when none), news (omitted when none, `publishedPostsWhere`), next event + about. `revalidate = 300`.

### Task A7: Verify and ship PR A

- [ ] `npx tsc --noEmit`, `npm test` green.
- [ ] Push, open PR against `devel`, wait for checks; screenshot the preview at 1280 px and 375 px.

## PR B — remaining public pages (planned after PR A is reviewed)

`PageHeader`, `/produkty` (+ detail), `/akce` (+ detail), `/blog` (+ detail, `next/image`), `/o-nas`, `/kontakt` (form removed), string moves (spec §7), `buttonClass` across cart/checkout/account/auth (spec §6), delete legacy aliases. Detailed in its own plan once PR A's look is approved, since review feedback on PR A will change it.
