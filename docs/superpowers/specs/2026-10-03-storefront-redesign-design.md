# Storefront Redesign — Design

**Date:** 2026-10-03
**Status:** Design approved in brainstorm; written spec awaiting review
**Tracks:** Step 3 of the path to launch ("new design")
**Follows:** `2026-09-12-dev-environment-split-and-farm-publishing-design.md` (steps 1–2)
**Mockups:** `.superpowers/brainstorm/18652-1790978372/content/shell-and-pages-v2.html` (gitignored, local only)

## Context

The storefront today mirrors the legacy `kurnik-sopa.cz`: a deep-green page,
cream type, a fixed decorative background, and no photography. Jan picked the
Wix template "Lewis Chicken Farm" (template 2456) as the look he wants instead.

That template cannot be lifted. Wix templates are not exportable, the markup is
renderer-specific, and its photographs are not licensed for reuse. What
transfers is the **design language**: a light warm ground, teal ink, a marigold
accent, an eyebrow-and-rules hero, a colour-blocked three-panel band, and a
short page of clearly separated blocks. This spec rebuilds that language
natively in Next 15 + Tailwind 4. No Wix asset, markup or image is copied.

Two facts shape everything below:

- **The farm has no photography.** The template leans on large photographs;
  this design must look complete with none.
- **The codebase assumes a dark page.** There are 218 `brand-*` class usages in
  33 files, and `text-brand-cream` alone appears 95 times. Flipping the ground
  inverts the meaning of most of them, so redefining eight colour values is not
  enough.

## Decisions taken

| Question | Decision |
|---|---|
| Photography | None available. The design does not depend on it. |
| Palette | The template's own: off-white, teal, marigold. The current green and gold are retired. |
| Typography | Unchanged: Bricolage Grotesque 800 for headings, Parkinsans for body. |
| Imagery | A small commissioned illustration set. The design ships with stand-in glyphs and takes the real art later without page changes. |
| Scope | Shell plus public pages get new layouts. Cart, checkout, account, auth and legal pages keep their layouts and get a colour-only pass. |
| Build approach | A semantic token layer, with the old `brand-*` names kept as temporary aliases and deleted when the last user is migrated. |

**Consequence accepted:** this is a rebrand. Anything printed or painted in the
old green and gold stops matching the site.

## Goals

- Every storefront route renders on the new light palette and meets WCAG 2.1 AA.
- Home, `/produkty`, `/akce`, `/blog`, `/o-nas`, `/kontakt` and their detail
  pages have the new layouts shown in the mockups.
- A phone user can reach every top-level page from the header.
- The commissioned illustrations can be dropped in by replacing files in one
  folder.
- No `brand-*`, `surface` or `text-*` legacy token remains when the work is done.

## Non-goals

- New layouts for cart, checkout, order pages, account or auth.
- A working contact form (see §5, `/kontakt`).
- Email templates, the Payload admin, metadata, sitemap, JSON-LD structure.
- Product photography, or any schema change to hold it.
- Dark mode.

## 1. Tokens

Defined in the `@theme` block of `src/app/globals.css`.

| Token | Value | Role |
|---|---|---|
| `ground` | `#FFFDFB` | Page |
| `ground-sunken` | `#F6F1EA` | Alternating band, page-header band |
| `ink` | `#285A5B` | Body text, headings, primary button fill, outlines |
| `ink-muted` | `#456766` | Secondary text |
| `ink-deep` | `#0D2120` | Footer ground; text on marigold |
| `accent` | `#FFB84D` | Marigold fills |
| `accent-strong` | `#F2A63A` | Hover state of marigold fills |
| `panel-blush` | `#F2E7E4` | Tinted panel |
| `panel-sage` | `#DDE6E2` | Tinted panel |
| `line` | `#E8E2DB` | Hairline rules, card borders |

`ink-muted` is `#456766`, not the `#4F7170` first proposed: the lighter value
measured 4.41:1 on blush and 4.20:1 on sage, under the 4.5:1 AA floor.

Measured contrast for the pairs the design uses:

| Text | On | Ratio |
|---|---|---|
| `ink` | `ground` / `ground-sunken` / `panel-blush` / `panel-sage` | 7.65 / 6.91 / 6.41 / 6.10 |
| `ink-muted` | `ground` / `ground-sunken` / `panel-blush` / `panel-sage` | 6.11 / 5.52 / 5.12 / 4.87 |
| `ink-deep` | `accent` | 9.73 |
| `ground` | `ink` | 7.65 |
| `ground` | `ink-deep` | 16.48 |

Rules:

1. **Marigold is never a text colour.** `accent` on `ground` is 1.69:1. It is a
   fill only — panels, button faces, badges, the date block, underline bars —
   and the text on it is always `ink-deep`.
2. **`line` is decorative.** At 1.27:1 it cannot be the only boundary of an
   interactive control. Buttons and chips use an `ink` border.
3. Focus is a 2 px `ink` outline with a 2 px offset (`ground` on the footer),
   applied through `:focus-visible` on links, buttons and form controls inside
   `.farm-frontend`.

`.farm-frontend` changes to `background: ground; color: ink`. The fixed
`body-bg.svg` background is removed along with the file. The `prose-invert`
variable overrides and the two unlayered `.farm-frontend .bg-white` rules are
deleted; long-form text uses `prose` with its body, heading, link and rule
variables set to `ink`, `ink-muted` and `line`.

### Legacy aliases

For the duration of the work the old names stay in `@theme`, under a comment
marking them for deletion:

| Legacy | Points at |
|---|---|
| `brand-green` | `ink` |
| `brand-green-dark`, `brand-green-deep` | `ink-deep` |
| `brand-green-light` | `panel-sage` |
| `brand-cream` | `ground-sunken` |
| `brand-cream-dark` | `line` |
| `brand-gold` | `accent` |
| `brand-gold-dark` | `accent-strong` |
| `surface` / `surface-muted` | `ground` / `ground-sunken` |
| `text-primary` | `ink` |
| `text-secondary`, `text-muted` | `ink-muted` |

`brand-cream` maps to `ground-sunken`, not `ground`: cream is used as a card
and button fill, and on `ground` those would vanish into the page.

The aliases keep un-migrated files readable between the two pull requests
(§8). They are a transition device, not the end state, and are deleted once no
file references them.

## 2. Shell

### Header

`Header.tsx` becomes a Server Component composing:

- **`Logo`** — the logo as an inline SVG component with `fill="currentColor"`,
  so one source serves the header (`ink`) and the footer (`ground`).
  `public/logo-kurnik-sopa.svg` stays for the JSON-LD publisher reference in
  `blog/[slug]`, with its fill changed from cream `#EEE4D8` to `#285A5B` so it
  is visible on white.
- **`NavLinks`** (client) — Produkty, Akce, O nás, Blog, Kontakt. The current
  page carries `aria-current="page"`, bold weight, and a 3 px marigold bar
  beneath it.
- **`LocaleSwitcher`** — moved up from the footer.
- **`HeaderUserMenu`** — existing behaviour when logged in (cart, name menu).
  When logged out it renders a "Přihlásit se" link instead of nothing.
- **`MobileNav`** (client) — below `md`, a menu button opening a `<dialog>`
  sheet with the five links at heading size, the locale switch, login or
  account links, and a tap-to-call button from SiteSettings. Native `<dialog>`
  supplies the focus trap and Esc; the sheet closes on navigation. The button
  exposes `aria-expanded` and `aria-controls`.

The header is sticky, `ground` at 95 % with backdrop blur, with a `line` rule
below. A "skip to content" link is the first focusable element on every page.

`CartBadge` swaps the 🛒 emoji for an inline SVG icon; the count pill is
`accent` with `ink-deep` text, and the link's accessible name includes the
item count using the existing `nav.cart.items` plural string.

**Why the mobile sheet is in scope:** the current nav is `hidden md:flex` with
no alternative. Below 768 px there is no navigation at all, and no login link
for anonymous visitors outside the footer.

### Footer

`ink-deep` ground — the site's one dark surface. Four columns collapsing to
one: logo, tagline and address; contact (phone, e-mail, WhatsApp); shop links;
account links and locale. A legal row carries copyright, terms, privacy,
cookies and cookie settings.

Address, phone, e-mail and WhatsApp come from the `site-settings` global via
the existing `src/lib/site-settings.ts` helper, replacing the hardcoded values.
Phone numbers render through `formatPhone`.

**Known dead link, not fixed here.** The footer's privacy link targets
`/cs/ochrana-osobnich-udaju`, which has no route and returns 404 on the dev
site (checked 2026-10-03). The redesigned footer keeps the link, because the
page has to exist before launch; creating it needs real legal text and is
listed under follow-up.

### Other shell pieces

- `Toaster` — `ground` fill, `line` border, `ink-deep` text.
- `cookieconsent-overrides.css` — primary buttons and toggles move from
  `#5a7d3a` to `ink`; secondary buttons to `ground-sunken`.

## 3. Shared primitives

New folder `src/components/ui/`. Each piece is presentational and free of data
access.

| Unit | Purpose |
|---|---|
| `button.ts` → `buttonClass(variant, size?)` | Returns the class string for `primary` (ink fill, ground text), `accent` (marigold fill, ink-deep text), `outline` (ink border). A function, not a component, so `<button>`, `<a>` and `Link` call sites change only their `className`. 4 px radius. |
| `SectionHeading` | Eyebrow (small, tracked, uppercase, `ink-muted`) above an `h2`. Optional hairline rules for the hero variant. |
| `PageHeader` | Inner-page opening band on `ground-sunken`: eyebrow, `h1`, optional one-line lead. Used by every page in §5 except the homepage and detail pages. |
| `Card` | `ground` fill, `line` border, 6 px radius, no shadow; border turns `ink` on hover and focus. Optional media slot. |
| `Badge` | Marigold pill with `ink-deep` text (seasonal, event type, full). |
| `DateBlock` | Marigold square with day number and short month, for events. Takes a date and a locale. |

Extracted from pages so they can be reused by the homepage:
`products/ProductCard`, `events/EventRow`, `blog/PostCard`.

## 4. Illustrations

`src/components/illustrations/` holds one component per drawing plus an index:

```tsx
<Illustration name="hen" className="size-24 text-ink" />
```

`name` is a union of the set below. Each file exports an inline SVG that takes
`currentColor` for its main fill and is `aria-hidden` (the neighbouring text
names the subject).

| Name | Subject | Used by |
|---|---|---|
| `chicken` | Broiler chicken on pasture | Farm block; category *Drůbež* |
| `hen` | Laying hen | Farm block; homepage panel; fallback |
| `eggs` | Eggs | Category *Vejce* |
| `rabbit` | Rabbit | Farm block; category *Králíci* |
| `goose` | Goose | Farm block |
| `vegetables` | Crate of vegetables | Farm block; homepage panel; category *Zelenina* |
| `microgreens` | Tray of shoots | Farm block |
| `scene` | Wide meadow with mobile coop and animals | Homepage hero |

A product without a photo shows its category's illustration on a tinted panel.
The mapping is a slug-keyed object in `illustrations/category-map.ts`
(`drubez`, `vejce`, `kralici`, `zelenina`); an unknown slug falls back to
`hen`. Blush and sage alternate by position.

**Stand-ins.** The flat glyphs from the mockup ship as the first version of
each file. They are deliberately plain. Replacing a file's contents with the
commissioned drawing is the whole integration step.

**Brief for the illustrator** (to hand over as-is):

- Eight drawings: the seven subjects above at 1:1, and `scene` at 3:1. The
  central 4:3 region of `scene` must work alone, as phones crop to it.
- SVG, flat fills, no gradients or raster. Transparent background.
- Two colours: teal `#285A5B` as the main colour and marigold `#FFB84D` for
  small accents. Off-white `#FFFDFB` may be used as knock-out detail.
- Hand-drawn character, in the spirit of the hen in the Wix "Lewis Chicken
  Farm" template — but original work, not a tracing.
- Must read clearly at 48 px and at 320 px.

## 5. Pages

All pages are Server Components using the Payload Local API. Prices render
through `formatPrice` (it exists in `src/lib/utils.ts` and currently has no
callers), dates through the `next-intl` formatter.

### Homepage

Six blocks:

1. **Hero** — eyebrow, rule, `h1` (`home.hero.title`), rule, lead
   (`home.hero.subtitle`, already in the message files but unused), primary
   button to `/produkty`, outline button to `/akce`, then the `scene`
   illustration full-width. The large logo leaves the hero; it lives in the
   header.
2. **Three panels** — blush panel with `hen`, marigold panel with a heading,
   one sentence and a button to `/produkty`, sage panel with `vegetables`. On
   phones the marigold panel comes first and the two illustration panels sit
   side by side beneath it.
3. **What we raise** — on `ground-sunken`. The six existing `home.farm.*`
   texts, each with its illustration; three columns, two on tablets, one on
   phones. The lowercase titles are kept as written.
4. **Featured products** — up to three products with `featured: true` and
   `status: published` (the `/produkty` filter), rendered with `ProductCard`,
   and a button to all products. With no featured product the block is
   omitted. Today this section is a heading over an empty grid.
5. **News** — on `ground-sunken`. The three latest posts as `PostCard`s.
   Omitted when there are none. See §8 for its dependency on the publishing
   work.
6. **Event and about** — two panels. Sage: the next upcoming event with
   `DateBlock`, title, time, place and places left, linking to `/akce`; when
   no event is upcoming it shows the existing `home.events` text. Blush: the
   existing `home.about` text linking to `/o-nas`.

### `/produkty` and `/produkty/[slug]`

Listing: `PageHeader`; category filter as chips (`outline`, active =
`primary`, `aria-pressed` as today, still client-side); `ProductCard` grid —
one, two, three columns. A card shows media (photo through `next/image`, or
the category illustration), category eyebrow, name, short description, price
with unit, and a seasonal `Badge`.

Detail: back link; two columns from `md`. Left, a square media area. Right,
the buying column: category eyebrow, `h1`, price with unit, weight, a
seasonal notice (marigold-tinted panel, `ink-deep` text), stock note,
`AddToCartButton`, and the two contact buttons as `outline`. Description
below in `prose`. On phones the buying column follows the image directly.

### `/akce` and `/akce/[slug]`

Listing: `PageHeader`; a vertical list of `EventRow`s rather than a card grid.
A row is `DateBlock`, event-type `Badge`, title, weekday · time · place, then
price and places left or "full". The date block is the visual, which is why
the list needs no photographs. Rows stack their right-hand column on phones.

Detail: today a single narrow column. It becomes two from `lg`: title, image
gallery (unchanged, `next/image`) and description on the left; on the right a
sticky panel with date, time, place, price, capacity, registration deadline
and the existing call and WhatsApp sign-up actions. On phones the panel sits
between the title and the description.

### `/blog` and `/blog/[slug]`

Listing: `PageHeader`; the newest post as a wide card (cover beside text), the
rest as two-up `PostCard`s. A post without a cover shows a tinted panel.
Covers move from `<img>` to `next/image`.

Article: one column of about 65 characters — category eyebrow, `h1`, author
and date, cover, body in `prose`.

### `/o-nas`

`PageHeader`; the CMS page body in a `prose` reading column; then the four
farm figures as a single ruled row (two-by-two on phones) with large
Bricolage numerals, replacing the four boxed cards.

### `/kontakt`

`PageHeader`; left, three large actions — call (`tel:`), WhatsApp, e-mail —
each rendered only when SiteSettings holds the value; right, a sage panel
with owner, address, opening hours and social links.

**The contact form is removed.** It is a bare `<form>` with no action and no
handler, so a visitor's message is discarded. Building a real one (endpoint,
validation, Resend, spam protection) is separate work and gets its own
ticket; until then the page offers only channels that work.

## 6. Colour pass on the remaining routes

Cart, checkout, thank-you, account, orders, auth, legal pages and `not-found`
keep their markup, layout and logic. They receive class-string edits only,
about 45 across some 20 files:

| Today | Becomes |
|---|---|
| `bg-brand-cream text-brand-green hover:bg-brand-cream-dark` (12 primary buttons) | `buttonClass('primary')` |
| `bg-brand-green text-brand-cream hover:bg-brand-green-deep` (2 buttons) | `buttonClass('primary')` |
| `border-brand-cream text-brand-cream …` (outline button in `AddressesManager`) | `buttonClass('outline')` |
| `text-brand-gold` (4 links, 1 heading) | `text-ink`, links underlined |
| Read-only e-mail box in `PersonalInfoForm` | `bg-ground-sunken border-line text-ink-muted` |
| `hover:border-brand-green`, `text-brand-green` | `ink` equivalents |
| `text-text-secondary` (22) | `text-ink-muted` |

`AddToCartButton` belongs to this group by file but sits on the product
detail page, so it is restyled with that page.

Form inputs keep their current `border-gray-300` styling. Their border
contrast is below 3:1 today and stays so; fixing it is out of scope here and
noted as follow-up.

## 7. Strings

Every string below moves into, or is added to, `messages/cs.json` and
`messages/en.json`. No Czech or English literal remains in the touched files.

New: `nav.skipToContent`, `nav.menu.open`, `nav.menu.close`,
`home.hero.eyebrow`, `home.panel.title`, `home.panel.body`, `home.panel.cta`,
`home.farm.eyebrow`, `home.farm.title`, `home.featured.all`, `home.news.*`,
page-header eyebrows and leads for the five inner pages, footer column
headings.

Currently hardcoded and to be moved: "Foto", "Foto produktu", "Sezónní
produkt" and its "dostupné … až …" sentence, "Popis" (product pages); the
four stat labels and the fallback sentence (`/o-nas`); "PSČ" (`/kontakt`);
"Cookies" and the address, phone and e-mail (footer — the last three move to
SiteSettings, not to messages).

Removed with the form: `contact.formName`, `contact.formEmail`,
`contact.formMessage`, `contact.formSubmit`, and the literal "Napište nám".

## 8. Sequencing

Two pull requests against `devel`:

1. **Foundation** — tokens and aliases, `ui/` primitives, illustrations with
   stand-ins, header, mobile nav, footer, toaster, cookie-consent colours, and
   the colour pass of §6. After it, every route is light and readable; the
   public pages still have their old layouts, carried by the aliases.
2. **Pages** — the layouts of §5, the string moves of §7, and deletion of the
   legacy aliases, `body-bg.svg` and the `prose-invert` overrides.

**Dependency on the publishing work.** The agreed path puts farm publishing
(the 2026-09-12 spec, tickets T2-1 … T2-10) before this redesign, and that
work is not finished: of the environment split only the upload gate is done,
and publishing has not started. Three of its tickets touch the same files:

- T2-4 / T2-6 change how published posts are queried (drafts, scheduling).
- T2-8 adds the homepage news block.
- T2-9 moves blog images to `next/image`.

This spec assumes publishing lands first. The redesign then restyles the news
block and reuses the shared query helper. If the order is reversed, T2-8 and
T2-9 are delivered here instead and dropped from the publishing tickets, and
the news block queries `status: published` until T2-4 replaces it.

## 9. Testing and verification

Automated (Vitest, `unit` project):

- `tests/unit/design/contrast.test.ts` — reads the token values out of
  `globals.css` and asserts every pair in the §1 table is at least 4.5:1, and
  that `accent` on `ground` is below it (so a future "accent text" change has
  to delete a test that says why not).
- `tests/unit/illustrations/category-map.test.ts` — each seeded category slug
  resolves; an unknown slug resolves to the fallback.
- `tests/unit/utils/format.test.ts` — `formatPrice(1250)` gives `1 250 Kč`,
  now that pages depend on it.

The repo has no component or browser test harness (deferred in Phase 4), so
layout is verified by hand and recorded in the pull request:

- Every storefront route (22 pages and `not-found`) in both locales at 375,
  768 and 1280 px: nothing light-on-light, no horizontal scroll, no clipped
  Czech text.
- Keyboard only: skip link, header, mobile sheet (open, tab cycle, Esc,
  focus returns to the button), product filter chips, add to cart.
- One full order on the dev site from product page to thank-you page.
- Lighthouse on home, `/produkty` and a product page: LCP < 2.5 s,
  CLS < 0.1, accessibility with no contrast failures.
- `grep -rn "brand-\|prose-invert\|text-text-\|bg-surface" src` returns
  nothing after pull request 2.
- `npx tsc --noEmit`, `npm test`, `npm run build` all pass.

## Risks

- **Stand-in glyphs may be live for a while.** If the commission slips past
  launch, the site launches with them. They are built to be acceptable, not
  good.
- **Colour pass on money paths.** §6 touches checkout and auth files. The
  edits are class strings only, and the full-order walk-through in §9 is the
  check.
- **Real photographs are still expected from the client.** When they arrive
  they replace illustration fallbacks on product, event and post cards with
  no code change; a photographic hero would be a new design decision.

## Follow-up, not in this work

- **Privacy policy page — blocks launch.** `/cs/ochrana-osobnich-udaju` is a
  404, and it is linked from the footer and from the Czech signup and checkout
  consent text. The English consent text links to `/en/terms` and
  `/en/privacy`, which are 404s as well (the terms page lives at
  `/en/obchodni-podminky`). Needs the legal text from the farm, a page, and
  corrected links. Ticket: `bd9ca642-cff6-42c3-9424-a410d29c1722`.
- A working contact form.
- Form-input border contrast across cart, checkout, account and auth.
- New layouts for cart, checkout, account and auth pages.
- An `illustration` field on product categories, if the farm adds categories
  the slug map does not know.
