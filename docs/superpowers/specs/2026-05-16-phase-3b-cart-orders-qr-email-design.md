# Phase 3b — Cart, checkout, orders, and QR Platba email

**Date:** 2026-05-16
**Status:** Draft (design)
**Scope of this spec:** Cart for logged-in customers, checkout at `/pokladna`, order placement that writes an `Order`, and four order-related emails — most importantly a post-order confirmation embedding a CZ QR Platba code for the farm's FIO bank account. Adds a `staff` user role with restricted `/admin` access to Orders and Carts.

This is the slice that unblocks launch. Phase 3b was originally Google OAuth (deferred); the launch-critical work — cart, orders, payment instructions — moves here and absorbs what was previously called Phase 3c.

**Explicitly out of scope:**
- Guest checkout. The `Orders` collection already has `guestEmail`/`guestName`/`guestPhone` fields; they stay in the schema, unused. Checkout requires login at launch.
- Order history view on `/ucet` (read-only list + detail). Follow-up PR right after launch.
- Balíkovna pickup-point integration. The enum value `balikovna` stays in `deliveryMethod` for forward-compat; the UI just doesn't offer it.
- Stripe / online card payments. `stripePaymentIntentID` stays unused.
- Automatic stock decrement on order. We validate stock at order time; staff manages quantities manually.
- Google OAuth (deferred past launch).
- Automated tests; repo has no test framework. Verification is a manual checklist (§13).

## 1. Goals & non-goals

**Goals**
- Logged-in customers can add products to a persistent server-side cart, review it at `/kosik`, and place an order via `/pokladna`.
- Order placement writes a single `Order` row with snapshotted prices.
- The customer immediately receives an order confirmation email. For bank transfer payments, that email contains a scannable CZ QR Platba code with the right account, amount, and variable symbol.
- Staff get a separate email notification per new order.
- Staff can log in to `/admin` and manage order lifecycle (paymentStatus, orderStatus, notes) without seeing other collections.
- Two further automated emails fire on staff-driven status changes: payment received, order ready/shipped.
- All flows work end-to-end in CZ and EN.

**Non-goals**
- Anything in the "Explicitly out of scope" list above.
- Payment provider integration beyond plain bank transfer (Stripe later).
- Stock locking / concurrency control beyond a "still in stock?" check at order time.
- Multi-currency. Everything is CZK at launch.
- Coupons, gift cards, promotional pricing.

## 2. Architecture overview

Single repo, no new services. All work inside the existing Next 15 + Payload v3 setup.

- **Cart state** lives in a new `Carts` Payload collection — one row per user, with an `items` array. Server Components read it directly via Payload Local API; cart mutations go through `PATCH /api/carts/:id` from the client.
- **Checkout** is a Server Component shell at `/cs/pokladna` (alias `/en/checkout`) that hydrates with the cart + user defaults, plus one client form component for the editable fields and submission.
- **Order placement** posts to a new custom Payload endpoint `POST /api/orders/place` which validates the cart against current product stock, generates `orderNumber`, snapshots prices, creates the `Order`, clears the cart, fires the customer + staff emails, and returns `{ orderNumber }`.
- **QR Platba** is generated server-side inside the order-placement endpoint when `paymentMethod === 'bank_transfer'`: derive IBAN from the SiteSettings Czech account fields, assemble the SPAYD string, render a PNG via the `qrcode` library, and attach it as an inline `cid:` image in the customer email.
- **Status-change emails** (payment received, ready/shipped) come from an `afterChange` hook on the Orders collection that diffs `paymentStatus` / `orderStatus` against `previousDoc`.
- **Staff role** is a new value on `Users.role`. Collection access rules and `admin.hidden` rules limit what staff see in `/admin`.

```
Browser ──PATCH──▶ /api/carts/<id>        (add/remove/update items)
Browser ──POST───▶ /api/orders/place      (custom endpoint, places order)
                    └─ validate stock
                    └─ generate orderNumber
                    └─ snapshot prices
                    └─ create Order
                    └─ delete Cart
                    └─ send customer email (with QR PNG inline)
                    └─ send staff notification
                    └─ return { orderNumber }
Browser ──nav────▶ /cs/pokladna/dekujeme/<orderNumber>
```

## 3. Data model

### 3.1 New: `Carts` collection

`src/collections/Carts/index.ts`:

```ts
{
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'updatedAt'],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read:   isAdminOrStaffOrOwner,
    update: isAdminOrStaffOrOwner,
    delete: isAdminOrStaffOrOwner,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      // Enforce one-cart-per-user via beforeChange hook (§3.1.1)
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'product',  type: 'relationship', relationTo: 'products', required: true },
        { name: 'quantity', type: 'number',       required: true, min: 1 },
      ],
    },
  ],
  hooks: {
    beforeChange: [enforceOneCartPerUser],
  },
}
```

Access predicate `isAdminOrStaffOrOwner`:
- `admin`, `staff` → true (full read; staff needs visibility for support).
- Authenticated customer → `{ user: { equals: req.user.id } }`.
- Anonymous → false.

#### 3.1.1 `enforceOneCartPerUser` hook
On `create`, query `carts` where `user.id === incoming.user`. If a row already exists, throw a Payload validation error. This is a soft constraint enforced in app code; we don't add a DB unique index because Payload's relationship field type doesn't expose one cleanly. App code that wants a cart uses a `getOrCreateCart(userId)` helper (§5.0) which never races into this case in practice.

### 3.2 `Orders` collection changes

Add these fields to `src/collections/Orders/index.ts`:

```ts
{ name: 'preferredDate',  type: 'date'   },   // free-form preferred delivery/pickup date
{ name: 'customerNote',   type: 'textarea' }, // optional notes from customer (time prefs, dietary, etc.)
{ name: 'locale',         type: 'select', options: ['cs', 'en'], required: true,
  admin: { description: 'Locale at order placement — used for future status-change emails' } },
{ name: 'qrSpayd',        type: 'text',  admin: { readOnly: true, description: 'Stored SPAYD string for forensic / re-render' } },
```

Update existing field options:

- `paymentMethod.options` — rename label of `cash_on_delivery` to "Hotově při odběru / doručení" (CZ) / "Cash on pickup / delivery" (EN). Value stays `cash_on_delivery`.
- `deliveryMethod.options` — no schema change; the UI just doesn't render `balikovna` at launch.

Add access rules to the collection (it currently has none — defaults to admin-only):

```ts
access: {
  create: ({ req }) => Boolean(req.user),           // only via the place endpoint anyway
  read:   isAdminOrStaffOrOrderOwner,                // §3.2.1
  update: isAdminOrStaff,                            // staff updates status; customers cannot edit
  delete: isAdmin,                                   // only full admin
}
```

#### 3.2.1 Read access for order owner
`isAdminOrStaffOrOrderOwner` returns:
- `admin`, `staff` → true.
- Authenticated customer → `{ or: [{ customer: { equals: req.user.id } }, { guestEmail: { equals: req.user.email } }] }`. The `guestEmail` clause is forward-compat — at launch it's never set.
- Anonymous → false.

This is what the follow-up `/ucet/objednavky` page will read.

#### 3.2.2 Field-level access for staff vs customer
Even within an order they own, customers must NOT be able to PATCH `paymentStatus`, `orderStatus`, `totalAmount`, or `items`. Add field-level `access.update` returning `req.user?.role === 'admin' || req.user?.role === 'staff'` on:

- `orderStatus`, `paymentStatus`, `notes`, `totalAmount`, `items`, `deliveryMethod`, `paymentMethod`, `customer`, `guestEmail`, `guestName`, `guestPhone`, `stripePaymentIntentID`, `qrSpayd`, `locale`.

In practice customers never PATCH orders at launch (no UI for it), so this is defense-in-depth — closing the door before someone builds a /ucet flow that opens it.

### 3.3 `Users.role` — add `staff`

```ts
{
  name: 'role',
  type: 'select',
  defaultValue: 'customer',
  options: [
    { label: 'Admin',    value: 'admin'    },
    { label: 'Staff',    value: 'staff'    },
    { label: 'Customer', value: 'customer' },
  ],
  required: true,
  access: { update: adminFieldOnly },
},
```

Staff users:
- Authenticate the same way as customers (email + password, verified).
- Are created **only** by an admin in `/admin` (no signup form path).
- Bypass the `/cs/registrace`/`/cs/prihlaseni` flow when accessing `/admin` — Payload's admin login is at `/admin/login`.

#### 3.3.1 Admin nav visibility for staff
Add `admin.hidden` to every collection and global that staff shouldn't see in the sidebar:

| Collection / global    | Admin sees | Staff sees | Customer sees |
|------------------------|-----------|-----------|---------------|
| Orders                 | ✅        | ✅        | ❌            |
| Carts                  | ✅        | ✅ (support) | ❌         |
| Users                  | ✅        | ❌        | ❌            |
| Media                  | ✅        | ❌        | ❌            |
| Products               | ✅        | ❌ (read-only later) | ❌  |
| ProductCategories      | ✅        | ❌        | ❌            |
| Events, EventRegs      | ✅        | ❌        | ❌            |
| Pages, Posts, Authors, PostCategories | ✅ | ❌ | ❌    |
| SiteSettings, Navigation, Footer | ✅ | ❌  | ❌            |

Mechanism: `admin.hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff'` on Orders + Carts; on every other collection/global, `({ user }) => user?.role !== 'admin'`.

Staff also can't reach those collections via the REST API directly because access rules deny — `admin.hidden` is UI-only and not a security boundary. Real enforcement is in `access`.

### 3.4 `SiteSettings` — `payment` group + `notificationEmail`

Add to `src/globals/SiteSettings.ts`:

```ts
{
  name: 'notificationEmail',
  type: 'email',
  admin: { description: 'Kam chodí upozornění na nové objednávky (např. info@kurniksopa.cz)' },
},
{
  name: 'payment',
  type: 'group',
  fields: [
    { name: 'bankName',       type: 'text', defaultValue: 'FIO banka', required: true },
    { name: 'accountPrefix',  type: 'text', admin: { description: 'Předčíslí účtu (volitelné, 0–6 číslic)' } },
    { name: 'accountNumber',  type: 'text', required: true,
      admin: { description: 'Číslo účtu, 2–10 číslic' } },
    { name: 'bankCode',       type: 'text', required: true,
      admin: { description: 'Kód banky, 4 číslice (FIO = 2010)' } },
  ],
},
```

Validation lives in helpers that read these values (§7); the admin field allows free text but we surface a clear error in the order-place flow if any value is missing or malformed when `bank_transfer` is the chosen payment method.

## 4. Routes added

| Internal path | CZ slug | EN slug | Auth |
|---|---|---|---|
| `/pokladna` | `/pokladna` | `/checkout` | logged-in only (redirect to `/prihlaseni`) |
| `/pokladna/dekujeme/[orderNumber]` | `/pokladna/dekujeme/[orderNumber]` | `/checkout/thank-you/[orderNumber]` | order-owner only |

`/kosik` already exists (auth-gated placeholder); this spec fleshes it out.

`/cs/pokladna/dekujeme/<orderNumber>` is the post-place success page; reads the order, shows the same content as the email (order summary + QR code if bank transfer) so the customer has a permanent in-app reference.

Update `src/lib/i18n/routing.ts` `pathnames`:

```ts
'/pokladna/dekujeme/[orderNumber]': {
  cs: '/pokladna/dekujeme/[orderNumber]',
  en: '/checkout/thank-you/[orderNumber]',
},
```

(`/pokladna` itself is already in routing.ts.)

## 5. Cart UX

### 5.0 `getOrCreateCart(userId)` helper

`src/lib/cart/getOrCreateCart.ts`:

```ts
export async function getOrCreateCart(payload, userId): Promise<Cart> {
  const found = await payload.find({
    collection: 'carts',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 2,   // resolve product refs (with images) for /kosik render
  })
  if (found.docs[0]) return found.docs[0]
  const created = await payload.create({
    collection: 'carts',
    data: { user: userId, items: [] },
    depth: 2,
  })
  return created
}
```

Used by `/kosik`, the header badge, the add-to-cart handler, and `/pokladna`.

### 5.1 Add-to-cart from product page

The existing product detail page (`/cs/produkty/[slug]`) gets a client-side "Přidat do košíku" button + quantity stepper. New component: `src/components/cart/AddToCartButton.tsx`.

Behavior when logged in:
1. PATCH `/api/carts/:cartId` with the updated `items` array (read-then-write — fetch current cart, append or merge by product id, send back).
2. On success, fire a Sonner toast: "Přidáno do košíku" with an "Otevřít košík" action (link to `/cs/kosik`).
3. Header cart badge refreshes via `router.refresh()`.

Behavior when not logged in:
1. Toast: "Pro nákup se prosím přihlaste" + a CTA button to `/prihlaseni?next=/produkty/<slug>` (the `next` query param is not consumed at launch — it's a stub for the future return-to behavior; login still hard-redirects to `/ucet`).

The button enforces `minimumOrder` (default step = 1, but can't go below the product's `minimumOrder` field when present).

### 5.2 `/kosik` page

`src/app/(frontend)/[locale]/kosik/page.tsx` becomes a real Server Component:

1. Resolve user via `payload.auth({ headers })`; redirect to `/registrace` if anonymous (current behavior preserved).
2. `getOrCreateCart(payload, user.id)`.
3. Render the client `<CartView/>` with cart items already populated.

`src/components/cart/CartView.tsx`:
- Mobile-first single-column. Each line item: thumbnail, name (locale), unit-price + unit (e.g. "120 Kč / kg"), quantity stepper, line total, remove button.
- Footer: subtotal in CZK (Czech-formatted, e.g. "1 250 Kč"), shipping line ("Doprava: zdarma v rámci regionu" — info only), total.
- Primary CTA at bottom: "Pokračovat k pokladně" → `/cs/pokladna`. Disabled if cart empty.
- Empty state: friendly empty illustration (skip illustration if not available — just text) + "Pokračovat v nákupu" linking to `/produkty`.
- All updates (quantity changes, removes) PATCH `/api/carts/:id` with full items[] array and `router.refresh()`. Optimistic UI is **not** worth the complexity at this stage.

### 5.3 Header cart badge

Add to `HeaderUserMenu.tsx` (Server Component): when user is logged in, look up their cart's item count (sum of quantities) and render a small badge `(N)` next to a cart icon. When empty, render no badge but keep the cart icon visible. When the user is not logged in, the cart icon links to `/registrace` (matches existing /kosik redirect logic).

Implementation detail: keep this in the same Server Component query that resolves the user, so it's one Payload call per page render. No client hydration needed.

## 6. Checkout (`/pokladna`)

### 6.1 Form structure

Single-page checkout. `src/app/(frontend)/[locale]/pokladna/page.tsx` is a Server Component that:

1. Resolves user; redirects to `/prihlaseni` if anonymous.
2. Loads the cart via `getOrCreateCart`. If cart is empty, redirects to `/kosik` (defensive).
3. Renders `<CheckoutForm initialValues={...} cart={...} payment={siteSettings.payment} bankName={...} />`.

`<CheckoutForm/>` is a client component holding all the editable state. Layout, top to bottom:

1. **Cart summary** (read-only block at top — line items, subtotal, total).
2. **Customer info** (name + phone pre-filled from `user.firstName/lastName/phone`, editable; email shown read-only from `user.email`).
3. **Delivery method radio** — Osobní odběr / Doručení. Default to user's last order's method if any; otherwise Osobní odběr.
4. **Pickup address block** — only shown when `deliveryMethod === 'pickup'`. Displays the farm address from `SiteSettings.address` plus contact phone and opening hours (read-only — informational).
5. **Delivery address block** — only shown when `deliveryMethod === 'delivery'`. Pre-filled from `user.addresses[0]` if present, with a "use a different address" toggle. Fields: street, city, zip (validated with `^\d{3}\s?\d{2}$`).
6. **Preferred date + customer note** — `<input type="date" min={today}>` + textarea.
7. **Payment method radio** — Bankovní převod (QR Platba) / Hotově při odběru / doručení. Default Bankovní převod.
8. **Place order button** ("Závazně objednat") — POST to `/api/orders/place`.

Required fields: customer name, phone, delivery address fields when method is delivery, preferred date, GDPR/terms checkbox (linking to the legal pages already stubbed in Phase 3a). Validation strings via `next-intl` namespace `checkout.errors.*`.

### 6.2 Stock validation

`POST /api/orders/place` runs server-side validation **before** writing anything:

1. Fetch the user's cart with `depth: 0` (product IDs only).
2. Fetch all referenced products in one `payload.find({ collection: 'products', where: { id: { in: ids } } })`.
3. For each item, check:
   - product exists (else: `productNotFound`)
   - `product.inStock === true` (else: `outOfStock`)
   - `product.stockQuantity == null || product.stockQuantity >= item.quantity` (else: `insufficientStock`)
   - `item.quantity >= (product.minimumOrder ?? 1)` (else: `belowMinimumOrder`)
   - seasonal availability: if `product.seasonal` and today is outside `availableFrom`–`availableTo`, fail with `outOfSeason`
4. If any item fails, return `{ ok: false, errors: [{ productId, code, productName }] }` with HTTP 409. UI surfaces these inline next to the cart-summary line.

### 6.3 Submit transaction

On validation pass:

1. Generate `orderNumber` = `YYYY` + next 6-digit sequence for the year, zero-padded → 10 chars total. Sequence: `payload.find({ collection: 'orders', where: { orderNumber: { like: 'YYYY%' } }, sort: '-orderNumber', limit: 1 })` and increment; on first order of the year, start at `000001`. **Race:** at single-staff launch volume this is fine. Document the race in §16 follow-ups (move to a `Counters` collection or DB sequence later).
2. Snapshot each item's price: `priceAtPurchase = product.price` at this moment. Compute `totalAmount` = sum of `priceAtPurchase * quantity`. (Delivery is free, so no shipping add-on.)
3. Build the order:
   ```ts
   {
     orderNumber,
     customer: user.id,
     items: [{ product, quantity, priceAtPurchase }],
     totalAmount,
     deliveryMethod, deliveryAddress (if delivery),
     paymentMethod,
     paymentStatus: 'pending',
     orderStatus: 'received',
     preferredDate, customerNote,
     locale: req.locale,
     qrSpayd: (paymentMethod === 'bank_transfer' ? buildSpayd(...) : null),
   }
   ```
4. `payload.create({ collection: 'orders', data })`.
5. `payload.delete({ collection: 'carts', id: cart.id })` (cart cleared on successful place).
6. Send the customer confirmation email (§8.1) and the staff notification email (§8.2). Wrap in try/catch — if email send fails, the order is already placed, log the failure but return success to the client. UI must not block on email.
7. Return `{ ok: true, orderNumber }`. Client `router.push('/cs/pokladna/dekujeme/<orderNumber>')`.

The order create + cart delete + emails are NOT transactional. Acceptable risk at launch volume: the bad case is "order placed, cart not cleared" — recoverable by the customer (just clear it). Worse cases ("cart cleared but order not placed") don't happen because order create runs first.

## 7. QR Platba

### 7.1 CZ IBAN derivation

`src/lib/payment/iban.ts`:

```ts
export function deriveCzIban(prefix: string | undefined, account: string, bankCode: string): string {
  const p  = (prefix ?? '').padStart(6, '0')
  const a  = account.padStart(10, '0')
  const b  = bankCode.padStart(4, '0')
  // ISO 13616: country letters → digits (C=12, Z=35), check=00, BBAN = bankCode + prefix + account
  const bban  = `${b}${p}${a}`           // 20 digits
  const numeric = `${bban}123500`         // CZ → 1235, check digits placeholder 00
  const remainder = bigIntMod(numeric, 97)
  const check  = String(98 - remainder).padStart(2, '0')
  return `CZ${check}${bban}`              // 24 chars total
}
```

`bigIntMod` is a 6-line helper (long mod via per-9-digit chunking) — fits in the same file. Or use `BigInt(numeric) % 97n` if the build target supports it (Node 22 does).

Pure function, fully unit-testable later. Inputs come from `SiteSettings.payment`.

### 7.2 SPAYD string

`src/lib/payment/spayd.ts`:

```ts
export function buildSpayd(input: {
  iban: string,           // e.g. CZ6520100000002901234567
  amount: number,         // in CZK, e.g. 1234.5
  variableSymbol: string, // orderNumber, 10 digits
  message: string,        // ASCII, e.g. 'Kurnik Sopa 2026000001'
}): string {
  const amt = input.amount.toFixed(2)
  const msg = stripDiacritics(input.message).slice(0, 60)
  return `SPD*1.0*ACC:${input.iban}*AM:${amt}*CC:CZK*X-VS:${input.variableSymbol}*MSG:${msg}`
}
```

`stripDiacritics` is one line: `s.normalize('NFD').replace(/[̀-ͯ]/g, '')` (the Unicode combining-diacriticals block). SPAYD's `MSG` field is technically Unicode-capable but several Czech banking apps still misrender diacritics, so ASCII-only is the safe default.

### 7.3 PNG rendering and inline embedding

Dependency: `qrcode` (already a popular maintained lib; ~10KB gzipped). Add to package.json.

```ts
import QRCode from 'qrcode'

const png = await QRCode.toBuffer(spaydString, {
  errorCorrectionLevel: 'M', // CZ banks expect at least L; M for resilience
  margin: 2,
  width: 320,
})
```

In the email send call, attach the buffer as a Resend inline attachment with `content_id: 'order-qr'`, and reference it in the HTML as `<img src="cid:order-qr" width="320" height="320" alt="QR kód pro platbu">`. Resend's API supports this via the `attachments[]` array with `content_id` set.

The same SPAYD string is stored on `order.qrSpayd` so we can re-render the QR (for the `/pokladna/dekujeme/...` page or the future `/ucet/objednavky/...` page) without recomputing from SiteSettings — that way, even if you change FIO accounts later, the existing order still shows the original QR that the customer is paying to.

## 8. Emails

All four templates live in `src/lib/email/templates.ts` alongside the existing verify + forgot. Same `wrap()` shell, same brand color. Order emails build on top of the existing infrastructure — Resend adapter via `payload.config.ts`, locale-aware copy via inline `t` table.

All four are sent via `payload.sendEmail({ to, subject, html, attachments? })`, which uses the configured Resend adapter. If `RESEND_API_KEY` is unset (local dev), Payload's default console transport logs them — same as today's verify/forgot emails.

### 8.1 Customer order confirmation

**Trigger:** synchronously inside `POST /api/orders/place`, after the order row is created.

**Recipient:** `order.customer.email`. Subject (CZ): `Objednávka č. 2026000001 přijata`. Subject (EN): `Order #2026000001 received`.

**Body content:**
- Greeting (with first name).
- "Děkujeme za objednávku" + order number, date.
- **Order summary table**: each item (name in locale, qty, unit-price, line-total), subtotal, total.
- **Delivery section**:
  - For `pickup`: farm address from SiteSettings, opening hours, phone.
  - For `delivery`: confirms delivery address; "Zdarma v rámci regionu" line.
  - Preferred date (formatted Czech-style: "15. dubna 2026").
  - Customer note if present.
- **Payment section** (varies by `paymentMethod`):
  - `bank_transfer`:
    - "Prosíme uhraďte částku **1 234 Kč** převodem na náš účet."
    - Czech account display: `2901234567/2010` (prefix-number/bankCode), bank name "FIO banka".
    - Variable symbol: the order number.
    - "Naskenujte QR kód v aplikaci své banky:" → embedded QR image (cid).
    - Fallback line: "Pokud váš banking nepodporuje QR, vyplňte údaje ručně." with the same fields tabulated below.
  - `cash_on_delivery`:
    - "Částku **1 234 Kč** uhradíte v hotovosti při odběru/doručení." No QR, no bank fields.
- Closing line + farm signature (`SiteSettings.owner`).

A condensed plaintext version is generated by stripping HTML — Resend takes both `html` and `text`.

### 8.2 Staff notification

**Trigger:** synchronously inside `POST /api/orders/place`, after the order is created. Sent if `SiteSettings.notificationEmail` is set; otherwise skipped (with a single console.warn at startup if it's unset on `payload.onInit`).

**Recipient:** `SiteSettings.notificationEmail`. Subject: `Nová objednávka 2026000001 — Antonín Wies` (customer's name).

**Body content (always Czech, regardless of customer locale):**
- One-line summary: order#, customer name, total, payment method, delivery method.
- Line items table.
- Delivery address (or "Osobní odběr").
- Preferred date + customer note.
- Link to `/admin/collections/orders/<id>` (absolute, using `NEXT_PUBLIC_SITE_URL`).
- No QR code (staff doesn't need to pay).

### 8.3 Payment received

**Trigger:** Orders collection `afterChange` hook. Fires when `previousDoc.paymentStatus !== 'paid'` and `doc.paymentStatus === 'paid'`.

**Recipient:** `doc.customer.email` (with depth=1 to resolve). Subject (CZ): `Platba k objednávce 2026000001 přijata`. Subject (EN): `Payment received for order #2026000001`.

**Body:**
- "Děkujeme, platba dorazila. Vaši objednávku již připravujeme."
- Summary line (order#, total).
- For pickup orders: "Až bude objednávka připravená k odběru, dáme vědět dalším e-mailem."
- For delivery orders: "Brzy vás budeme kontaktovat ohledně termínu doručení."

### 8.4 Order ready / shipped

**Trigger:** same hook, fires when `previousDoc.orderStatus` differs from `doc.orderStatus` AND `doc.orderStatus` ∈ {`preparing`, `shipped`, `delivered`}.

Two subject/body variants:
- `preparing` → no email at launch (status change is internal). Listed here so we don't accidentally fire one.
- `shipped`:
  - For `deliveryMethod === 'pickup'`: "Vaše objednávka je připravena k odběru" — pickup address + opening hours + contact phone.
  - For `deliveryMethod === 'delivery'`: "Vaše objednávka je na cestě" — "Brzy vás budeme kontaktovat ohledně času doručení" (we have no tracking ID).
- `delivered` → no email at launch.

The hook reads `req.payload.sendEmail` and a small `pickEmail({ from, to })` function chooses the right template. Hook is idempotent: if the same status is saved twice, no email fires because `previousDoc.orderStatus === doc.orderStatus`.

### 8.5 Email infrastructure

- **From-address:** existing `defaultFromAddress` from the Resend adapter (`info@kurniksopa.cz` or `EMAIL_FROM`). Per-message override is not needed.
- **Reply-to:** all customer-facing order emails set `reply_to: SiteSettings.contact.email` so customer replies route to the farm inbox, not to the no-reply transactional sender. (`payload.sendEmail` passes arbitrary fields through to the underlying nodemailer transport, which the Resend adapter forwards.)
- **Locale:** customer-facing emails use `order.locale`. Staff email is always CZ.
- **Light styling pass on existing emails:** also update `verifyEmailTemplate` and `forgotPasswordTemplate` to share the same updated `wrap()` shell (no major redesign — just ensure brand consistency and that the new order-confirmation email doesn't look out of place next to verify/forgot in the inbox). Acceptance: side-by-side in test inbox, fonts/colors/footer match.

## 9. Staff role + `/admin` access

### 9.1 Role enum (already in §3.3)

### 9.2 Collection access matrix (already in §3.3.1)

### 9.3 Field-level updates available to staff on Orders

Staff (and admin) can change:
- `paymentStatus`
- `orderStatus`
- `notes`

Staff cannot change (admin can):
- `orderNumber`, `customer`, `items`, `totalAmount`, `preferredDate`, `customerNote`, `deliveryMethod`, `deliveryAddress`, `paymentMethod`, `locale`, `qrSpayd`, `guestEmail`, `guestName`, `guestPhone`, `stripePaymentIntentID`.

Mechanism: field-level `access.update: ({ req }) => req.user?.role === 'admin'` on the immutables. The three editable fields get `access.update: ({ req }) => ['admin','staff'].includes(req.user?.role)`.

### 9.4 Carts visibility for staff

Staff can read carts (for support: "where's my cart? what did I have in it?"). Staff can't update other users' carts; field-level update access for `items` is admin-only. Staff can `delete` a cart (rare, for cleanup) — admin-only on delete is also acceptable; pick admin-only for v1 to reduce blast radius.

### 9.5 Creating a staff user

No UI for this. Admin manually creates the user in `/admin/collections/users/create`, sets `role: 'staff'`, and emails them their initial password out-of-band (or hands them a password to set via the existing forgot-password flow). Documented in the PR description.

## 10. i18n strings

New `next-intl` namespaces (added to `messages/cs.json` and `messages/en.json`):

```
cart.{title, empty.{title, body, cta}, lineItem.{remove, qty}, summary.{subtotal, shipping, total, shippingFree}, cta.{continueShopping, checkout}}
cart.added.{toast, action}

checkout.{title, sections.{customer, delivery, payment, note}, fields.{firstName, lastName, phone, street, city, zip, preferredDate, customerNote, useOtherAddress, agreement}, deliveryMethod.{pickup, delivery, pickupInfo, deliveryFreeRegion}, paymentMethod.{bankTransfer, cashOnDelivery}, submit, errors.{required, zipInvalid, generic, outOfStock, insufficientStock, belowMinimumOrder, outOfSeason, productNotFound, agreementRequired}}

checkout.thankYou.{title, body, paymentTitle, paymentBankTransfer, paymentCashOnDelivery, qrAlt, accountLabel, vsLabel, amountLabel, bankLabel, manualFallback}

email.orderConfirmation.{subject, greeting, intro, summaryTitle, deliveryTitle, pickupInfo, deliveryInfo, preferredDate, customerNote, paymentTitle, paymentBankTransfer.{prompt, scan, manual}, paymentCash, closing}
email.staffNotification.{subject, intro, viewInAdmin}  // CZ only
email.paymentReceived.{subject, body.{pickup, delivery}}
email.orderShipped.{subject, body.{pickup, delivery}}

nav.cart.{cart, items}
```

**Anchor CZ strings** (illustrative — full list lives in the JSON files):

| Key | CZ | EN |
|---|---|---|
| `cart.empty.title` | Košík je prázdný | Your cart is empty |
| `cart.summary.shippingFree` | Doprava: zdarma v rámci regionu | Shipping: free within region |
| `cart.cta.checkout` | Pokračovat k pokladně | Continue to checkout |
| `checkout.submit` | Závazně objednat | Place order |
| `checkout.paymentMethod.bankTransfer` | Bankovní převod (QR platba) | Bank transfer (QR payment) |
| `checkout.paymentMethod.cashOnDelivery` | Hotově při odběru/doručení | Cash on pickup/delivery |
| `checkout.errors.outOfStock` | Položka {name} už není skladem | Item {name} is out of stock |
| `email.orderConfirmation.paymentBankTransfer.scan` | Naskenujte QR kód v aplikaci své banky | Scan the QR code in your banking app |

Add `cart` to `nav.auth` adjacent labels — actually a separate `nav.cart` namespace as listed.

Toast keys extended in `src/lib/toast-keys.ts`:
- `'addedToCart'` (success)
- `'orderPlaced'` (success — shown briefly on `/pokladna/dekujeme/...` arrival, or by the redirect query param flow)
- `'paymentMethodMissingBankDetails'` (error — surfaced if SiteSettings.payment is incomplete and customer selects bank_transfer)

## 11. Access control summary (security checklist)

The collection + field-level rules must produce these properties:

- Anonymous user: cannot create, read, update, or delete any cart or order. Storefront cart UI redirects them to `/registrace`.
- Customer A: cannot read or modify customer B's cart or order. `/api/carts/<B_cart_id>` → 403. `/api/orders/<B_order_id>` → 403.
- Customer A: can read+update their own cart, can read their own orders, **cannot update** any order field (Phase 3b has no customer-facing order edit).
- Customer attempting `PATCH /api/orders/<self_order>` with `paymentStatus: 'paid'` → field-level access denies (silent strip or 403; status unchanged on re-read).
- Customer attempting `PATCH /api/users/<self>` with `role: 'staff'` → already denied via Phase 3a's `adminFieldOnly` on `role`.
- Staff user: can read all orders and carts, can update orderStatus/paymentStatus/notes on orders, cannot change item lines or totals, cannot read other collections via REST.
- Staff cannot delete orders (only admin can).
- The `_verificationToken` and `resetPasswordToken` fields are still not exposed (unchanged from Phase 3a).

All must be verified manually (§13.4) before merge.

## 12. Env vars

No new environment variables. All configuration (FIO account, notification email) lives in SiteSettings, editable in `/admin`.

`RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` from Phase 3a continue to apply. Verify they are set on Vercel **Production** scope before promoting.

## 13. Verification plan

The repo has no test framework. Verification is manual against this checklist, plus automated build/type/migration checks.

### 13.1 Automated (CI / pre-merge)
- `npm run build` clean.
- `npm run generate:types` leaves working tree clean after the run.
- `npm run generate:importmap` is a no-op (no new admin components).
- `npx payload migrate` applies cleanly on a fresh Docker DB.

### 13.2 Manual — cart
1. As logged-in customer, add 2× of one product → toast appears, header badge shows `2`, `/kosik` lists the line at qty 2.
2. Change quantity in `/kosik` to 5 → updates, total recalculates.
3. Remove item → cart empties to "Košík je prázdný" + CTA to `/produkty`.
4. Add product where `minimumOrder = 3` → quantity stepper enforces ≥ 3 client-side; trying to PATCH below via devtools → server rejects.
5. Add product, log out, log back in (same user) → cart still there.
6. Add product on `/cs` then switch to `/en/cart` → same cart, locale-localized labels.

### 13.3 Manual — checkout & order placement
7. Empty cart → navigate to `/cs/pokladna` directly → redirects to `/kosik`.
8. Non-empty cart → `/cs/pokladna` renders summary + form; phone pre-filled from `user.phone`; if `user.addresses[0]` exists, delivery address pre-fills when toggling to "Doručení".
9. Submit with missing required field → inline error keyed to that field.
10. Submit with `Bankovní převod` selected but `SiteSettings.payment.accountNumber` empty → error toast `paymentMethodMissingBankDetails`; order not created.
11. Submit valid order → redirected to `/cs/pokladna/dekujeme/<orderNumber>`; cart now empty; in `/admin`, order is visible with all fields correct.
12. Confirmation email arrives at customer inbox; QR scans correctly in a real banking app (FIO test) and shows the expected amount + VS = orderNumber.
13. Notification email arrives at `SiteSettings.notificationEmail` with admin link that opens the order.
14. Place another order same year → orderNumber increments by 1 (e.g. `2026000002`).
15. Place an order across a year boundary (manually back-date a record or stub the year) → next orderNumber starts at `YYYY000001`.

### 13.4 Manual — security & access
16. Customer A places order. Customer B (logged in) tries `GET /api/orders/<A_order_id>` → 403.
17. Customer A tries `PATCH /api/orders/<self_order>` with `paymentStatus: 'paid'` → on re-read, status unchanged.
18. Customer A tries `DELETE /api/carts/<B_cart_id>` → 403.
19. Anonymous `GET /api/carts/<any>` → 403.
20. Customer A tries `GET /api/users/<staff_user_id>` → 403 (Phase 3a access still holds).

### 13.5 Manual — staff /admin
21. Create staff user via admin panel → user receives forgot-password email → sets password → logs in to `/admin/login`.
22. Staff `/admin` sidebar shows only Orders + Carts. No Users, Media, Products, Globals.
23. Staff opens an Order, changes paymentStatus to `paid` → save succeeds; customer receives "Platba přijata" email; the order's previousStatus check prevented duplicate email on a subsequent no-op save.
24. Staff opens an Order, changes orderStatus to `shipped` → save succeeds; customer receives "Vaše objednávka je připravena k odběru" / "...na cestě" email per delivery method.
25. Staff tries to change `totalAmount` directly → field is read-only / save with that field fails silently (admin-only).
26. Staff tries to delete an Order → button absent or returns 403.
27. Staff opens Carts collection → sees all carts; opens one, tries to edit items → can't (field-locked).

### 13.6 Manual — emails
28. Place 4 orders (one per variant: pickup+bank, pickup+cash, delivery+bank, delivery+cash). Verify each customer email contains the right content blocks. QR appears only on the two `bank_transfer` ones.
29. Place an order on `/en/checkout` → email is English; staff notification is still Czech.
30. Reply to a customer email → reply lands at `SiteSettings.contact.email` (reply_to honored).
31. Update an order's paymentStatus to `paid` twice in a row in /admin → only one "payment received" email fires.

### 13.7 Manual — UI quality
32. iPhone-sized viewport: `/kosik` and `/pokladna` render single-column, no horizontal scroll, tap targets ≥ 44px.
33. Forms keyboard-navigable; visible focus rings; labels associated with inputs.
34. Email rendered in Gmail web + iPhone Mail: brand colors correct, QR sharp, no broken images.

### 13.8 Deployment verification
Items 11–14 and 23–24 must also pass on the Vercel preview URL using a real Resend send to a personal inbox before promoting to production. The QR code must scan correctly when emailed (not just in dev's console-logged HTML).

## 14. Dependencies added

- `qrcode` — QR PNG generation. ~25KB. Mainstream maintained lib.

That's it. SPAYD assembly and IBAN derivation are inline (~50 lines combined).

## 15. Deliverables

A single PR `feature/phase-3b-cart-orders` containing:

**New collections / globals**
- `src/collections/Carts/index.ts` + hook file for `enforceOneCartPerUser`
- `src/collections/Orders/index.ts` — added fields, access rules, field-level locks, afterChange hook for status emails
- `src/collections/Users/index.ts` — `staff` added to role options
- `src/globals/SiteSettings.ts` — `payment` group + `notificationEmail`

**Library code**
- `src/lib/cart/getOrCreateCart.ts`
- `src/lib/payment/iban.ts` (deriveCzIban + bigIntMod helper)
- `src/lib/payment/spayd.ts` (buildSpayd + stripDiacritics)
- `src/lib/payment/qr.ts` (renderQrPng — wraps `qrcode`)
- `src/lib/orders/orderNumber.ts` (generateOrderNumber)
- `src/lib/orders/placeOrder.ts` (orchestrates validation → create → emails)
- `src/lib/email/templates.ts` — four new exports + updated `wrap()` shell

**Endpoints**
- `src/collections/Orders/endpoints/placeOrder.ts` — registered in Orders.endpoints

**Routes**
- `src/app/(frontend)/[locale]/kosik/page.tsx` — fleshed out
- `src/app/(frontend)/[locale]/pokladna/page.tsx`
- `src/app/(frontend)/[locale]/pokladna/dekujeme/[orderNumber]/page.tsx`

**Components**
- `src/components/cart/AddToCartButton.tsx` (client)
- `src/components/cart/CartView.tsx` (client)
- `src/components/cart/CartBadge.tsx` (server; embedded in HeaderUserMenu)
- `src/components/checkout/CheckoutForm.tsx` (client)
- `src/components/checkout/ThankYouContent.tsx` (server)
- `src/components/checkout/QrInline.tsx` (server; renders the QR image into a data-URL `<img>` for the in-app thank-you page since cid: only works in email)
- `src/components/products/ProductDetail.tsx` — integrate `AddToCartButton` (small edit)
- `src/components/layout/HeaderUserMenu.tsx` — add CartBadge

**i18n + routing**
- `src/lib/i18n/routing.ts` — `/pokladna/dekujeme/[orderNumber]` added
- `src/lib/toast-keys.ts` — three new keys
- `messages/cs.json`, `messages/en.json` — all new keys

**Schema / regeneration**
- `src/migrations/<new>_cart_orders.ts`
- `src/payload-types.ts` (regenerated)

**Other**
- `package.json` — adds `qrcode` + `@types/qrcode`

PR description includes:
- The Vercel preview-verification checklist (§13.8) with a real test scan from FIO's banking app screenshot attached.
- Creation steps for the first staff user (§9.5).
- Reminder to fill in `SiteSettings.payment` and `SiteSettings.notificationEmail` on production before going live.

## 16. Open follow-ups

- `/ucet/objednavky` (order history list + read-only detail per order). Should land immediately after this PR — it's the natural extension and reuses the same data model. Should re-render the QR for `paymentStatus === 'pending'` bank_transfer orders so customers can find it without searching email.
- Guest checkout. The data model already supports it; UI work is the gap. Reopen when there's volume data suggesting registration friction is hurting conversion.
- Balíkovna integration (UI + pickup-point picker + cost handling).
- Stripe online payments. `stripePaymentIntentID` field is already there.
- Stock decrement automation (currently manual). The validation hook in §6.2 is the natural place to add it later.
- `orderNumber` sequence race — move to a `Counters` collection or DB sequence if volume warrants.
- Abandoned-cart recovery email — Carts has `updatedAt`; a cron job + email template would be straightforward.
- Test framework (Vitest + Playwright) — still open from Phase 3a.
- Resend domain verification for `kurniksopa.cz` — still open from Phase 3a.
