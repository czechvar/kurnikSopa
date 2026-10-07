# Tickets — Launch commerce, invitation-only accounts, batches

Derived from the brainstorm on 2026-10-07 (grilled with Jan, `/grill-with-docs`),
the farm's brief in `resources/WEB.docx`, and a code audit of the cart, orders,
accounts and admin the same day.

Three shipping units: **PR3 = launch commerce**, **PR4 = invitation-only accounts**,
**PR5 = batches**. Sizes: S ≈ under an hour, M ≈ half a day, L ≈ a day or more.

**Update 2026-10-07, late evening:** guest ordering stays on (see Accounts below), Stripe
and Balíkovna are removed outright. PR3 therefore also carries guest carts (cookie
token) and guest checkout; PR4 keeps invitation-only accounts; PR5's confirmation flow
must work through the tokenised order link for guests, not only behind a login.

Vocabulary: `CONTEXT.md`. Decisions: `docs/adr/0001-cash-only-at-pickup.md`,
`docs/adr/0002-invitation-only-customer-accounts.md`.

**Filed on the Workstreams board (`kurnikSopa`, channel `QKLCFY`) on 2026-10-07.**
The board is the live state; this file is the original write-up. Task ids:

| Ticket | Workstreams task id |
|---|---|
| PR3 umbrella | `49c6a1e2-74b9-456e-8bde-f0dd9e701ae5` |
| T3-1 Fix thank-you page order lookup (security) | `467240e1-3b5e-4d00-83ba-1e1cd723346f` |
| T3-2 Carts: force `user` to the caller | `c2e83d6d-0f2e-4476-9b45-33e244ab31d6` |
| T3-3 Cash only | `eac8c953-24ae-49b3-8f97-568d9626f718` |
| T3-4 PickupPoints collection | `1c244cad-19b7-412d-812c-7b7bee7b8d6a` |
| T3-5 Checkout: Pickup Point + day | `84f43674-4a7e-4d3f-9db9-c8370eecb99f` |
| T3-6 Catalogue hygiene | `bd11687e-6535-431f-b927-d1c0cda823ff` |
| PR4 umbrella | `ec885a00-aaa2-437a-a9d5-c53cd6e460f2` |
| T4-1 Users status + access | `23d39f70-0ee8-4c76-a0b8-e7b6caf146ce` |
| T4-2 Access request form | `765f1bc8-e03b-4d85-8b54-4c2651b8d108` |
| T4-3 Invitation flow | `adcba974-1241-46ad-b5c2-d74068abfdff` |
| T4-4 User admin | `86bc0c4d-dac5-4a87-b3e8-b847df7505c1` |
| T4-5 Staff may invite and block | `9dbfca10-fc82-4888-a42d-00ef1ddee3c0` |
| T4-6 Login copy, `?next=`, locale paths | `6d067784-2691-4462-be5f-8dfa1cd38715` |
| PR5 umbrella | `3412d507-9aa7-48ee-948d-014ccadedf4b` |
| T5-1 Batches collection | `2d0dbbad-5d86-461a-8536-f79ccec59c85` |
| T5-2 Product: averageWeight, bookable batches | `a7a715a4-ec4c-4284-9a8a-7230cc1faaf2` |
| T5-3 Orders: statuses, batch + pickup fields | `74bdeb0a-3818-4cfa-a4b4-18e9ca5de02d` |
| T5-4 Booking flow | `5ddad7bb-448e-4323-a597-0c6325cb9855` |
| T5-5 Confirmation flow | `ae4389ed-02fe-4666-bbc8-f28a8e133420` |
| T5-6 Daily cron | `9a40f587-2fbe-4177-8a7c-c30dde073683` |
| T5-7 Roster admin view | `aaba33ee-5970-403f-a858-6f68126f039e` |
| T5-8 Phone orders by Staff | `c5010065-76b0-42ba-909f-b54722275be3` |
| T5-9 Batch emails | `500fe182-8d30-4314-aba5-848c5daad23f` |
| Later: parking ticket | `c8ae8587-ffd5-48e7-85c6-02dcf36b0ffd` |

---

## Decisions the tickets rest on

| Question | Decision |
|---|---|
| Selling model | Reservation-first. Meat is booked against a **Batch** (turnus); eggs and vegetables are buy-now. |
| Payment | **Cash at pickup only.** No Stripe, no deposits, no bank transfer in the storefront. ADR 0001. |
| Fulfilment | Pickup only, at the farm or a **Pickup Point** the owner designates. No delivery, no Balíkovna. |
| Batch | Own collection, one product per Batch. `planned` (bookings, no dates) → `open` (dates + confirmation deadline) → `closed` → `completed`; `cancelled`. Owner creates future Batches explicitly. |
| Booking vs Order | One **Order** record. `booked` → `confirmed` → `ready` → `picked_up`; `released` when never confirmed; `cancelled`. |
| Capacity | In units (birds). Bookings count from day one. Over-booking only by the owner editing the number. |
| Confirmation | Required before the deadline; unconfirmed bookings released by a daily cron; reminder 3 days before. |
| Pricing | By the kilo, ordered by the bird. Product gains `averageWeight`; customer sees an estimate; Roster records real weight and cash. |
| Pickup days | A list of (day, Pickup Point) pairs on the Batch; no time slots. |
| Accounts | **Invitation only** for accounts (access-request form → owner/Staff invite → set-password link, 7 days; statuses `requested / invited / active / blocked`), but **ordering needs no account**: a guest gives name, phone and email and reaches the order through a tokenised link in the confirmation email. Jan reversed the "login required" answer the same evening ("guest checkout yes because customer has to order product, just not paying"). ADR 0002. |
| Roles | Reuse `staff` for order handling and inviting; owner is `admin`; `editor` unchanged. |
| Phone orders | Staff enter them with name + phone (guest fields). No account for people without email. |
| Admin screens | Per-Batch **Roster** (printable) and a user admin with status columns and per-user actions. |
| Launch scope | Launch with PR3 (buy-now eggs/vegetables, phone buttons on meat); PR4 and PR5 follow. |

## Implementation notes (2026-10-07, overnight)

- PR3 → GitHub #19, PR4 → #20 (stacked), PR5 → stacked on #20. All three on worktree
  branches `feature/launch-commerce`, `feature/invitation-accounts`, `feature/batches`.
- Batches: a full batch is **not** auto-closed (that would block the confirmations of
  people who already hold units); new bookings simply stop when `remaining` is 0, and
  the daily cron closes the batch after its deadline. `bookedCount` is kept by Orders
  hooks with an atomic SQL guard, so phone orders entered by Staff count the same way.
- The Roster lives at `/admin/collections/batches/<id>/roster` as a custom document
  view (`src/components/admin/RosterView.tsx`); `importMap.js` regenerated.

## Audit findings folded into tickets

- Thank-you page lets any logged-in user read any order by number → T3-1 (fixed with a per-order `accessToken`, which also serves guests).
- Cart can be created for another user; minimum order not enforced server-side → T3-2.
- Stock never decremented; out-of-season products addable; `/api/products` leaks drafts → T3-6 (decrement deliberately out of scope).
- Login ignores `?next=`; client navigations drop the locale → T4-6.
- `sendStatusEmails` skips orders without a `customer` → T5-8.
- Order number not concurrency-safe; account deletion orphans orders; no rate limiting → parking ticket.
