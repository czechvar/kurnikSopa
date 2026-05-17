# Order History for Registered Users — Design

Pull-forward from Phase 4 plan: customer-facing order history under `/ucet/objednavky`. Built on top of Phase 3b's Orders collection. No reorder, no customer-initiated cancellation, no pagination — those stay in Phase 4 if launch demand warrants them.

## Goals

- Registered customers can see the orders they placed (and only their own).
- Customers can review past order details, including unpaid bank-transfer orders where the QR Platba should still render so they can pay belatedly.
- Discovery: link from `/cs/ucet` profile page and from the header user dropdown.

## Non-goals

- Guest order lookup. Guest checkout is supported by the Orders schema but no UI for it lands here. Guests still receive the order confirmation email with all the same info.
- Reorder. Cloning a past order's items back into the cart can be added in Phase 4.
- Customer cancellation. Staff handles cancellations from `/admin`.
- Pagination, filters, search.

## Pages

### List — `/cs/ucet/objednavky` (and `/en/...`)

Server Component.

- Auth gate: `payload.auth({ headers })` → if no user, `redirect('/prihlaseni')`.
- Query: `payload.find({ collection: 'orders', where: { customer: { equals: user.id } }, sort: '-createdAt', depth: 0 })`.
- Each row: order number, locale-formatted date, total, payment status badge, order status badge. Linked to `/ucet/objednavky/[orderNumber]`.
- Layout: simple list/table on desktop, stacked cards on mobile (existing Tailwind responsive utilities). No special table component.
- Empty state: localized "no orders yet" + CTA → `/produkty`.

### Detail — `/cs/ucet/objednavky/[orderNumber]`

Server Component.

- Auth gate.
- Lookup: `payload.find({ collection: 'orders', where: { orderNumber: { equals: orderNumber }, customer: { equals: user.id } }, limit: 1, depth: 1 })`. The `customer: { equals: user.id }` clause prevents one customer from peeking at another's order by guessing order numbers — defense-in-depth on top of the collection's access rule.
- Not found → `notFound()` (404). Not 403, to avoid leaking whether an order number exists.
- Loads SiteSettings (same as thank-you page).
- Renders breadcrumb `Objednávky / 2026000001` + the shared `<OrderDetail>` component, with `showQr` true when `paymentMethod === 'bank_transfer'` AND `paymentStatus !== 'paid'`.

## Component refactor

Extract a shared `<OrderDetail>` Server Component from the current `ThankYouContent`. It becomes the single source of truth for rendering one order's body:

- New file: `src/components/orders/OrderDetail.tsx`
- Props: `{ order: Order; settings: SiteSetting; locale: 'cs' | 'en'; showQr: boolean }`
- Renders: items table, delivery method/address, payment block. QR is rendered only when `showQr` is true and order is bank_transfer with unpaid state.
- `ThankYouContent` keeps the celebratory wrapper (title + body sentence + continue-shopping CTA) and delegates the rest to `<OrderDetail showQr />`.
- The new history detail page wraps `<OrderDetail>` with breadcrumb + status header.

Locale source: the order has a stored `locale` field that records the language used at checkout. The history pages use the current UI locale (consistent with the rest of the storefront), not the order's stored locale. The stored locale stays the source of truth for emails.

## Discovery

Two entry points:

1. **`/cs/ucet` profile page** — add a section (above or below existing profile fields) with a single link card "Moje objednávky" → `/ucet/objednavky`.
2. **`HeaderUserMenu` dropdown** — add a `<Link>` "Moje objednávky" between the displayed name and the Logout button.

## Routing

The Czech and English slugs `/ucet/objednavky` are added to `src/lib/i18n/routing.ts`. English uses `/account/orders` (matching the existing `/ucet` → `/account` and `/kosik` → `/cart` conventions if applicable; if not, use parallel Czech-only slugs as the codebase currently does — verify against existing routing entries during implementation).

## i18n keys

Added under `account.orders` in `messages/cs.json` and `messages/en.json`:

- `title` — "Moje objednávky" / "My orders"
- `empty.title`, `empty.body`, `empty.cta`
- `columns.orderNumber`, `columns.date`, `columns.total`, `columns.paymentStatus`, `columns.orderStatus`
- `detail.breadcrumb` — "Objednávky" / "Orders"
- `detail.unpaidNotice` — short prompt that this order still awaits payment

Payment and order status labels are not re-translated; they come from the Order doc's stored value via the existing Czech labels in `Orders/index.ts` (and English fallback). Out of scope to add full bilingual status labels — those existing CZ labels are acceptable for launch since the admin is internal anyway, and the customer sees `paymentStatus` / `orderStatus` raw values mapped to short cs labels.

## Files

| File | Action |
|---|---|
| `src/components/orders/OrderDetail.tsx` | NEW — extracted from ThankYouContent |
| `src/components/checkout/ThankYouContent.tsx` | MODIFY — delegate to OrderDetail |
| `src/app/(frontend)/[locale]/ucet/objednavky/page.tsx` | NEW — list page |
| `src/app/(frontend)/[locale]/ucet/objednavky/[orderNumber]/page.tsx` | NEW — detail page |
| `src/app/(frontend)/[locale]/ucet/page.tsx` | MODIFY — add link to history |
| `src/components/layout/HeaderUserMenu.tsx` | MODIFY — add link in dropdown |
| `messages/cs.json`, `messages/en.json` | MODIFY — add `account.orders.*` keys |
| `src/lib/i18n/routing.ts` | MODIFY — add `/ucet/objednavky` pathname |

## Access control

Already enforced at the Orders collection level (Phase 3b Task 6): `read: isAdminOrStaffOrOrderOwner` returns `{ customer: { equals: req.user.id } }` for non-staff users, so even without the explicit `customer` filter in the history page's `find`, customers can only see their own orders. The explicit filter is still added for defense-in-depth and clearer intent.

## Verification

- `npm run build` clean.
- Manually verify:
  - Logged-out user visiting `/ucet/objednavky` redirects to `/prihlaseni`.
  - Logged-in user with no orders sees the empty state.
  - Logged-in user with orders sees the list, newest first.
  - Clicking a row navigates to detail page.
  - Detail page shows QR for unpaid bank_transfer orders, hides QR when paid.
  - Trying to visit another user's `/ucet/objednavky/[orderNumber]` → 404.
  - HeaderUserMenu dropdown shows the new "Moje objednávky" link.
  - `/ucet` profile page shows the new section/card.
