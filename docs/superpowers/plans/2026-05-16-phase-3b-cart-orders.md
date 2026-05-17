# Phase 3b — Cart, Orders, QR Platba Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a logged-in-only cart at `/kosik`, a single-page checkout at `/pokladna`, an order-placement endpoint that snapshots prices and writes an `Order`, and four order-related emails — most importantly a customer confirmation with an embedded CZ QR Platba code for the farm's FIO account. Add a `staff` user role with restricted `/admin` access.

**Architecture:** New `Carts` Payload collection (one row per user), checkout posts to a custom `/api/orders/place` endpoint that runs stock validation → snapshot prices → write Order → delete cart → send emails. QR generation is server-side: hand-rolled SPAYD + CZ-IBAN derivation, PNG via the `qrcode` lib, attached inline as a `cid:` reference in the customer email. Status-change emails (payment received, order ready/shipped) fire from an Orders `afterChange` hook.

**Tech Stack:** Next.js 15 (App Router, React 19) · Payload CMS v3 · PostgreSQL (Neon prod, Docker local) · Tailwind 4 · next-intl · Resend (via `@payloadcms/email-resend`) · `qrcode` (new dep).

**Spec:** `docs/superpowers/specs/2026-05-16-phase-3b-cart-orders-qr-email-design.md`

**Conventions reminder:**
- All commands run from `repo/` unless otherwise noted (the repo root in this monorepo layout).
- TypeScript strict mode. No `any`.
- Commits are **suggested** at task boundaries; the user runs them.
- After any collection or global change, regenerate types **and** create + apply a migration (Task 8 batches this).
- No automated tests in this phase; verification is the manual checklist (Task 28) which mirrors spec §13.

---

## File Inventory

**Created**
- `src/collections/Carts/index.ts`
- `src/collections/Carts/hooks/enforceOneCartPerUser.ts`
- `src/collections/Orders/endpoints/placeOrder.ts`
- `src/collections/Orders/hooks/sendStatusEmails.ts`
- `src/lib/cart/getOrCreateCart.ts`
- `src/lib/payment/iban.ts`
- `src/lib/payment/spayd.ts`
- `src/lib/payment/qr.ts`
- `src/lib/orders/orderNumber.ts`
- `src/lib/orders/placeOrder.ts`
- `src/app/(frontend)/[locale]/pokladna/page.tsx`
- `src/app/(frontend)/[locale]/pokladna/dekujeme/[orderNumber]/page.tsx`
- `src/components/cart/CartView.tsx`
- `src/components/cart/AddToCartButton.tsx`
- `src/components/cart/CartBadge.tsx`
- `src/components/checkout/CheckoutForm.tsx`
- `src/components/checkout/ThankYouContent.tsx`
- `src/components/checkout/QrInline.tsx`

**Modified**
- `src/collections/Users/index.ts` — add `staff` role option
- `src/collections/Orders/index.ts` — new fields, access rules, field-level locks, register hook + endpoint
- `src/collections/{Media,Products,ProductCategories,Events,EventRegistrations,Pages,Posts,PostCategories,Authors}/index.ts` — add `admin.hidden` non-admin guard
- `src/globals/{SiteSettings,Navigation,Footer}.ts` — `admin.hidden`; SiteSettings adds `payment` group + `notificationEmail`
- `src/payload.config.ts` — register Carts collection
- `src/lib/i18n/routing.ts` — add thank-you path
- `src/lib/toast-keys.ts` — three new keys
- `src/lib/email/templates.ts` — order-confirmation, staff-notification, payment-received, order-shipped templates
- `src/app/(frontend)/[locale]/kosik/page.tsx` — replace placeholder
- `src/components/layout/HeaderUserMenu.tsx` — embed `<CartBadge/>`
- `src/components/products/ProductDetail.tsx` (or wherever the product detail body lives) — embed `<AddToCartButton/>`
- `messages/cs.json`, `messages/en.json` — new keys
- `package.json` — add `qrcode` + `@types/qrcode`

---

## Task 1: Add new i18n strings

**Files:**
- Modify: `messages/cs.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add cart + checkout + email keys to `messages/cs.json`**

Open `messages/cs.json` and add at the top level (alongside the existing root keys):

```json
{
  "cart": {
    "title": "Košík",
    "empty": {
      "title": "Košík je prázdný",
      "body": "Procházejte naše produkty a přidejte si něco do košíku.",
      "cta": "Pokračovat v nákupu"
    },
    "lineItem": {
      "remove": "Odebrat",
      "qty": "Množství"
    },
    "summary": {
      "subtotal": "Mezisoučet",
      "shipping": "Doprava",
      "shippingFree": "Zdarma v rámci regionu",
      "total": "Celkem"
    },
    "cta": {
      "continueShopping": "Pokračovat v nákupu",
      "checkout": "Pokračovat k pokladně"
    },
    "added": {
      "toast": "Přidáno do košíku",
      "action": "Otevřít košík"
    }
  },
  "checkout": {
    "title": "Pokladna",
    "sections": {
      "customer": "Vaše údaje",
      "delivery": "Doručení",
      "payment": "Platba",
      "note": "Poznámka k objednávce"
    },
    "fields": {
      "firstName": "Jméno",
      "lastName": "Příjmení",
      "email": "E-mail",
      "phone": "Telefon",
      "street": "Ulice a č.p.",
      "city": "Město",
      "zip": "PSČ",
      "preferredDate": "Preferované datum",
      "customerNote": "Poznámka (čas, dietní preference apod.)",
      "useOtherAddress": "Použít jinou doručovací adresu",
      "agreement": "Souhlasím s [obchodními podmínkami](/cs/obchodni-podminky) a [zpracováním osobních údajů](/cs/ochrana-osobnich-udaju)."
    },
    "deliveryMethod": {
      "pickup": "Osobní odběr",
      "delivery": "Doručení",
      "pickupInfo": "Vyzvedněte si objednávku na farmě v Křepicích.",
      "deliveryFreeRegion": "Doručení zdarma v rámci regionu"
    },
    "paymentMethod": {
      "bankTransfer": "Bankovní převod (QR platba)",
      "cashOnDelivery": "Hotově při odběru / doručení"
    },
    "submit": "Závazně objednat",
    "errors": {
      "required": "Toto pole je povinné",
      "zipInvalid": "PSČ musí mít formát 123 45",
      "generic": "Něco se pokazilo, zkuste to prosím znovu",
      "agreementRequired": "Pro pokračování musíte souhlasit s podmínkami",
      "outOfStock": "Položka {name} už není skladem",
      "insufficientStock": "Položky {name} máme méně, než je ve vašem košíku",
      "belowMinimumOrder": "Položku {name} je třeba objednat v minimálním množství {min}",
      "outOfSeason": "Položka {name} aktuálně není dostupná",
      "productNotFound": "Položka už není v nabídce",
      "paymentMethodMissingBankDetails": "Bankovní účet pro převod není nastaven. Zvolte prosím platbu v hotovosti nebo nás kontaktujte."
    },
    "thankYou": {
      "title": "Děkujeme za objednávku",
      "body": "Vaše objednávka č. {orderNumber} byla přijata. Potvrzení jsme vám poslali e-mailem.",
      "paymentTitle": "Platba",
      "paymentBankTransfer": "Naskenujte QR kód ve své bankovní aplikaci, nebo zadejte údaje ručně:",
      "paymentCashOnDelivery": "Částku uhradíte v hotovosti při odběru / doručení.",
      "qrAlt": "QR kód pro platbu",
      "accountLabel": "Číslo účtu",
      "vsLabel": "Variabilní symbol",
      "amountLabel": "Částka",
      "bankLabel": "Banka",
      "manualFallback": "Pokud vám QR kód nefunguje, použijte tyto údaje:"
    }
  },
  "email": {
    "orderConfirmation": {
      "subject": "Objednávka č. {orderNumber} přijata",
      "greeting": "Dobrý den {name},",
      "intro": "Děkujeme za objednávku v Kurníku Šopa. Níže najdete shrnutí a pokyny k platbě.",
      "summaryTitle": "Vaše objednávka",
      "deliveryTitle": "Doručení",
      "pickupInfo": "Osobní odběr na adrese: {address}. Otevírací doba: {hours}. Tel.: {phone}.",
      "deliveryInfo": "Doručíme na: {address}. Doprava zdarma v rámci regionu.",
      "preferredDate": "Preferované datum: {date}",
      "customerNote": "Poznámka: {note}",
      "paymentTitle": "Platba",
      "paymentBankTransferPrompt": "Prosíme uhraďte částku {amount} převodem na náš účet.",
      "paymentBankTransferScan": "Naskenujte QR kód v aplikaci své banky:",
      "paymentBankTransferManual": "Pokud váš banking nepodporuje QR, vyplňte údaje ručně:",
      "paymentCash": "Částku {amount} uhradíte v hotovosti při odběru / doručení.",
      "closing": "Brzy se vám ozveme. S pozdravem, {owner}"
    },
    "staffNotification": {
      "subject": "Nová objednávka {orderNumber} — {customerName}",
      "intro": "Přišla nová objednávka.",
      "viewInAdmin": "Otevřít v administraci"
    },
    "paymentReceived": {
      "subject": "Platba k objednávce {orderNumber} přijata",
      "body": "Děkujeme, platba dorazila. Vaši objednávku již připravujeme.",
      "pickupNote": "Až bude objednávka připravená k odběru, dáme vědět dalším e-mailem.",
      "deliveryNote": "Brzy vás budeme kontaktovat ohledně termínu doručení."
    },
    "orderShipped": {
      "subjectPickup": "Vaše objednávka {orderNumber} je připravena k odběru",
      "subjectDelivery": "Vaše objednávka {orderNumber} je na cestě",
      "bodyPickup": "Objednávku si můžete vyzvednout na adrese: {address}. Otevírací doba: {hours}. Tel.: {phone}.",
      "bodyDelivery": "Vaši objednávku právě vezeme. Brzy vás budeme kontaktovat ohledně času doručení."
    }
  },
  "nav": {
    "cart": {
      "cart": "Košík",
      "items": "{count, plural, =0 {prázdný} one {# položka} few {# položky} other {# položek}}"
    }
  }
}
```

If `messages/cs.json` already has any of the top-level keys (`cart`, `checkout`, `email`, `nav`), merge — don't overwrite. The `email` namespace already has `verify` and `forgot`; append `orderConfirmation`, `staffNotification`, `paymentReceived`, `orderShipped` inside it.

- [ ] **Step 2: Add the parallel keys to `messages/en.json`**

Mirror the structure above with English text. Sample anchors:

```json
{
  "cart": {
    "title": "Cart",
    "empty": {
      "title": "Your cart is empty",
      "body": "Browse our products and add something to your cart.",
      "cta": "Continue shopping"
    },
    "lineItem": { "remove": "Remove", "qty": "Quantity" },
    "summary": {
      "subtotal": "Subtotal",
      "shipping": "Shipping",
      "shippingFree": "Free within region",
      "total": "Total"
    },
    "cta": {
      "continueShopping": "Continue shopping",
      "checkout": "Continue to checkout"
    },
    "added": { "toast": "Added to cart", "action": "Open cart" }
  },
  "checkout": {
    "title": "Checkout",
    "sections": {
      "customer": "Your details",
      "delivery": "Delivery",
      "payment": "Payment",
      "note": "Order note"
    },
    "fields": {
      "firstName": "First name",
      "lastName": "Last name",
      "email": "Email",
      "phone": "Phone",
      "street": "Street and number",
      "city": "City",
      "zip": "ZIP",
      "preferredDate": "Preferred date",
      "customerNote": "Note (time, dietary preferences, etc.)",
      "useOtherAddress": "Use a different delivery address",
      "agreement": "I agree to the [terms](/en/terms) and [privacy policy](/en/privacy)."
    },
    "deliveryMethod": {
      "pickup": "Pickup at farm",
      "delivery": "Delivery",
      "pickupInfo": "Pick up your order at the farm in Křepice.",
      "deliveryFreeRegion": "Free delivery within region"
    },
    "paymentMethod": {
      "bankTransfer": "Bank transfer (QR payment)",
      "cashOnDelivery": "Cash on pickup / delivery"
    },
    "submit": "Place order",
    "errors": {
      "required": "This field is required",
      "zipInvalid": "ZIP must be in 123 45 format",
      "generic": "Something went wrong, please try again",
      "agreementRequired": "You must agree to the terms to continue",
      "outOfStock": "Item {name} is out of stock",
      "insufficientStock": "We have fewer of {name} than in your cart",
      "belowMinimumOrder": "Minimum order for {name} is {min}",
      "outOfSeason": "Item {name} is not currently available",
      "productNotFound": "Item is no longer available",
      "paymentMethodMissingBankDetails": "Bank transfer is not configured. Please choose cash payment or contact us."
    },
    "thankYou": {
      "title": "Thank you for your order",
      "body": "Your order #{orderNumber} has been received. We've sent the confirmation to your email.",
      "paymentTitle": "Payment",
      "paymentBankTransfer": "Scan the QR code in your banking app, or enter the details manually:",
      "paymentCashOnDelivery": "You'll pay in cash on pickup / delivery.",
      "qrAlt": "Payment QR code",
      "accountLabel": "Account number",
      "vsLabel": "Variable symbol",
      "amountLabel": "Amount",
      "bankLabel": "Bank",
      "manualFallback": "If the QR doesn't work, use these details:"
    }
  },
  "email": {
    "orderConfirmation": {
      "subject": "Order #{orderNumber} received",
      "greeting": "Hello {name},",
      "intro": "Thanks for your order at Kurník Šopa. Below is the summary and payment instructions.",
      "summaryTitle": "Your order",
      "deliveryTitle": "Delivery",
      "pickupInfo": "Pickup at: {address}. Opening hours: {hours}. Phone: {phone}.",
      "deliveryInfo": "We'll deliver to: {address}. Free delivery within region.",
      "preferredDate": "Preferred date: {date}",
      "customerNote": "Note: {note}",
      "paymentTitle": "Payment",
      "paymentBankTransferPrompt": "Please pay {amount} by bank transfer to our account.",
      "paymentBankTransferScan": "Scan the QR code in your banking app:",
      "paymentBankTransferManual": "If your banking app doesn't support QR, enter the details manually:",
      "paymentCash": "You'll pay {amount} in cash on pickup / delivery.",
      "closing": "We'll be in touch soon. Regards, {owner}"
    },
    "staffNotification": {
      "subject": "New order {orderNumber} — {customerName}",
      "intro": "A new order has arrived.",
      "viewInAdmin": "Open in admin"
    },
    "paymentReceived": {
      "subject": "Payment received for order #{orderNumber}",
      "body": "Thanks, we've received your payment. We're preparing your order now.",
      "pickupNote": "We'll send another email when your order is ready for pickup.",
      "deliveryNote": "We'll be in touch shortly to arrange delivery time."
    },
    "orderShipped": {
      "subjectPickup": "Your order #{orderNumber} is ready for pickup",
      "subjectDelivery": "Your order #{orderNumber} is on its way",
      "bodyPickup": "You can pick up your order at: {address}. Opening hours: {hours}. Phone: {phone}.",
      "bodyDelivery": "Your order is on its way. We'll contact you shortly with the delivery time."
    }
  },
  "nav": {
    "cart": {
      "cart": "Cart",
      "items": "{count, plural, =0 {empty} one {# item} other {# items}}"
    }
  }
}
```

- [ ] **Step 3: Verify both files parse**

Run from `repo/`:
```bash
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('messages/cs.json','utf8'))).length, Object.keys(JSON.parse(require('fs').readFileSync('messages/en.json','utf8'))).length)"
```
Expected: two equal numbers (or one off by one if you nest differently). Any throw = invalid JSON, go fix.

- [ ] **Step 4: Suggested commit**

```bash
git add messages/
git commit -m "feat(i18n): cart, checkout, and order email strings"
```

---

## Task 2: Routing + toast keys

**Files:**
- Modify: `src/lib/i18n/routing.ts`
- Modify: `src/lib/toast-keys.ts`

- [ ] **Step 1: Add the thank-you pathname**

In `src/lib/i18n/routing.ts`, inside the `pathnames` object, after the existing `/pokladna` entry:

```ts
'/pokladna/dekujeme/[orderNumber]': {
  cs: '/pokladna/dekujeme/[orderNumber]',
  en: '/checkout/thank-you/[orderNumber]',
},
```

- [ ] **Step 2: Extend the toast key union**

Edit `src/lib/toast-keys.ts`:

```ts
export type ToastKey =
  | 'loginRequiredCart'
  | 'emailVerified'
  | 'passwordReset'
  | 'addedToCart'
  | 'orderPlaced'
  | 'paymentMethodMissingBankDetails'

export type ToastType = 'success' | 'info' | 'error'

const TOAST_TYPES: readonly ToastType[] = ['success', 'info', 'error'] as const
const TOAST_KEYS: readonly ToastKey[] = [
  'loginRequiredCart',
  'emailVerified',
  'passwordReset',
  'addedToCart',
  'orderPlaced',
  'paymentMethodMissingBankDetails',
] as const

export function isToastKey(v: unknown): v is ToastKey {
  return typeof v === 'string' && (TOAST_KEYS as readonly string[]).includes(v)
}

export function isToastType(v: unknown): v is ToastType {
  return typeof v === 'string' && (TOAST_TYPES as readonly string[]).includes(v)
}

export function toastQuery(key: ToastKey, type: ToastType): { toast: ToastKey; type: ToastType } {
  return { toast: key, type }
}

export function buildToastUrl(href: string, key: ToastKey, type: ToastType): string {
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}toast=${encodeURIComponent(key)}&type=${encodeURIComponent(type)}`
}
```

- [ ] **Step 3: Add Czech + English strings for the new toast keys**

In `messages/cs.json` (and the en mirror), if there's a `toasts` namespace, add:

```jsonc
// CS
"addedToCart": "Přidáno do košíku",
"orderPlaced": "Objednávka odeslána",
"paymentMethodMissingBankDetails": "Bankovní účet pro převod není nastaven. Zvolte prosím platbu v hotovosti nebo nás kontaktujte.",
```

```jsonc
// EN
"addedToCart": "Added to cart",
"orderPlaced": "Order placed",
"paymentMethodMissingBankDetails": "Bank transfer is not configured. Please choose cash payment or contact us.",
```

If the toast strings live elsewhere (e.g. inline in the Toaster component), match the existing pattern. Check `src/components/toast/` and `src/lib/toast-keys.ts` callers to confirm placement.

- [ ] **Step 4: Suggested commit**

```bash
git add src/lib/i18n/routing.ts src/lib/toast-keys.ts messages/
git commit -m "feat(routing): add thank-you path and order toast keys"
```

---

## Task 3: SiteSettings — payment group + notificationEmail

**Files:**
- Modify: `src/globals/SiteSettings.ts`

- [ ] **Step 1: Add the two new fields**

Inside the `fields: [...]` array of `SiteSettings`, add:

```ts
{
  name: 'notificationEmail',
  type: 'email',
  admin: {
    description: 'Kam chodí upozornění na nové objednávky (např. info@kurniksopa.cz)',
  },
},
{
  name: 'payment',
  type: 'group',
  fields: [
    {
      name: 'bankName',
      type: 'text',
      defaultValue: 'FIO banka',
      required: true,
    },
    {
      name: 'accountPrefix',
      type: 'text',
      admin: { description: 'Předčíslí účtu (volitelné, 0–6 číslic)' },
    },
    {
      name: 'accountNumber',
      type: 'text',
      required: true,
      admin: { description: 'Číslo účtu, 2–10 číslic' },
    },
    {
      name: 'bankCode',
      type: 'text',
      required: true,
      admin: { description: 'Kód banky, 4 číslice (FIO = 2010)' },
    },
  ],
},
```

- [ ] **Step 2: Restrict SiteSettings admin visibility to admin role**

Add to the global config at the top level (alongside `slug`, `fields`, etc.):

```ts
admin: {
  hidden: ({ user }) => user?.role !== 'admin',
},
```

If `admin` already exists, merge `hidden` in.

- [ ] **Step 3: Suggested commit (held until Task 8 migration)**

Don't commit yet — wait for the migration batch in Task 8.

---

## Task 4: Users collection — add `staff` role

**Files:**
- Modify: `src/collections/Users/index.ts`

- [ ] **Step 1: Add the staff option to the role enum**

Find the `role` field in `Users.fields`:

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

- [ ] **Step 2: Hide the Users collection from non-admin in /admin**

In the Users collection config, in the `admin` block:

```ts
admin: {
  useAsTitle: 'email',
  hidden: ({ user }) => user?.role !== 'admin',
},
```

(Staff don't manage other users — only admins do. Customers don't see /admin at all.)

- [ ] **Step 3: Hold commit for Task 8**

---

## Task 5: Carts collection + hook

**Files:**
- Create: `src/collections/Carts/index.ts`
- Create: `src/collections/Carts/hooks/enforceOneCartPerUser.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Create the hook**

`src/collections/Carts/hooks/enforceOneCartPerUser.ts`:

```ts
import type { CollectionBeforeChangeHook } from 'payload'

export const enforceOneCartPerUser: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const userId = typeof data.user === 'object' ? data.user?.id : data.user
  if (!userId) return data

  const existing = await req.payload.find({
    collection: 'carts',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
  })

  if (existing.docs.length > 0) {
    throw new Error('Cart for this user already exists')
  }
  return data
}
```

- [ ] **Step 2: Create the collection**

`src/collections/Carts/index.ts`:

```ts
import type { CollectionConfig, Access } from 'payload'
import { enforceOneCartPerUser } from './hooks/enforceOneCartPerUser'

const isAdminOrStaff = (req: { user?: { role?: string } | null }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

const isAdminOrStaffOrOwner: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdminOrStaff(req)) return true
  return { user: { equals: req.user.id } }
}

const ownerOnlyUpdate: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  // staff cannot mutate other users' carts
  return { user: { equals: req.user.id } }
}

export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'updatedAt'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read:   isAdminOrStaffOrOwner,
    update: ownerOnlyUpdate,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [enforceOneCartPerUser],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
      ],
    },
  ],
}
```

- [ ] **Step 3: Register in payload.config.ts**

In `src/payload.config.ts`, add the import alongside the others:

```ts
import { Carts } from '@/collections/Carts'
```

And insert `Carts` into the `collections` array, immediately after `Users`:

```ts
collections: [
  Users,
  Carts,
  Media,
  // ...rest unchanged
],
```

- [ ] **Step 4: Hold commit for Task 8**

---

## Task 6: Orders collection — fields, access, hook registration

**Files:**
- Modify: `src/collections/Orders/index.ts`

- [ ] **Step 1: Add new fields**

Inside the `fields: [...]` array of `Orders`, add — placement: `preferredDate` and `customerNote` belong with delivery, near `deliveryAddress`; `locale` and `qrSpayd` belong in the sidebar near the other read-only metadata:

```ts
// near deliveryAddress
{
  name: 'preferredDate',
  type: 'date',
  admin: {
    description: 'Preferované datum doručení / odběru',
  },
},
{
  name: 'customerNote',
  type: 'textarea',
  admin: {
    description: 'Poznámka zákazníka (čas, dietní preference apod.)',
  },
},

// in the sidebar group
{
  name: 'locale',
  type: 'select',
  required: true,
  options: [
    { label: 'CZ', value: 'cs' },
    { label: 'EN', value: 'en' },
  ],
  defaultValue: 'cs',
  admin: {
    position: 'sidebar',
    description: 'Lokalizace použitá pro e-maily o stavu objednávky',
  },
},
{
  name: 'qrSpayd',
  type: 'text',
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: 'Uložený SPAYD řetězec pro forenzní účely / re-render',
  },
},
```

- [ ] **Step 2: Add field-level locks on staff-immutable fields**

For each of these fields (existing AND newly added), add an `access: { update: adminFieldOnly }` where `adminFieldOnly = ({ req }) => req.user?.role === 'admin'`. Add the helper at the top of the file alongside the imports:

```ts
import type { CollectionConfig, Access, FieldAccess } from 'payload'

const adminOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'
const adminOrStaff: FieldAccess = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'
```

Apply `access: { update: adminOnly }` to:
- `orderNumber`, `customer`, `guestEmail`, `guestName`, `guestPhone`, `items`, `totalAmount`,
  `deliveryMethod`, `deliveryAddress`, `paymentMethod`, `stripePaymentIntentID`,
  `preferredDate`, `customerNote`, `locale`, `qrSpayd`.

Apply `access: { update: adminOrStaff }` to:
- `paymentStatus`, `orderStatus`, `notes`.

This is defense-in-depth — at launch customers never PATCH orders.

- [ ] **Step 3: Add collection-level access rules**

At the top of the `Orders` config (before `fields`):

```ts
const isAdminOrStaffOrOrderOwner: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin' || req.user.role === 'staff') return true
  return {
    or: [
      { customer: { equals: req.user.id } },
      { guestEmail: { equals: req.user.email } },
    ],
  }
}

const isAdminOrStaff: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
```

Then in the collection:

```ts
access: {
  create: ({ req }) => Boolean(req.user),
  read:   isAdminOrStaffOrOrderOwner,
  update: isAdminOrStaff,
  delete: isAdmin,
},
admin: {
  useAsTitle: 'orderNumber',
  defaultColumns: ['orderNumber', 'customer', 'totalAmount', 'orderStatus', 'paymentStatus'],
  hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
},
```

- [ ] **Step 4: Register the placeholder endpoint + hook (created in later tasks)**

Below `fields`, add (these import paths will exist after Tasks 18 and 19; for now this will fail typecheck — that's fine, we'll come back):

```ts
import { placeOrderEndpoint } from './endpoints/placeOrder'
import { sendStatusEmails } from './hooks/sendStatusEmails'

// inside the export const Orders = ...
endpoints: [placeOrderEndpoint],
hooks: {
  afterChange: [sendStatusEmails],
},
```

Note: leaving these imports here means typecheck fails until Tasks 18 + 19 land. If you'd prefer green-typecheck-per-task, comment them out and uncomment after those tasks. Either way fine.

- [ ] **Step 5: Hold commit for Task 8**

---

## Task 7: Hide non-admin collections + globals from non-admin users

**Files:** (each gets a 2-line edit)
- Modify: `src/collections/Media/index.ts`
- Modify: `src/collections/Products/index.ts`
- Modify: `src/collections/ProductCategories/index.ts`
- Modify: `src/collections/Events/index.ts`
- Modify: `src/collections/EventRegistrations/index.ts`
- Modify: `src/collections/Pages/index.ts`
- Modify: `src/collections/Posts/index.ts`
- Modify: `src/collections/PostCategories/index.ts`
- Modify: `src/collections/Authors/index.ts`
- Modify: `src/globals/Navigation.ts`
- Modify: `src/globals/Footer.ts`

(SiteSettings already handled in Task 3; Users already handled in Task 4; Orders + Carts intentionally NOT hidden — staff sees them.)

- [ ] **Step 1: For each file, add `hidden` to the `admin` block**

In each collection / global config, find the `admin: { ... }` block (or add one). Add the predicate:

```ts
admin: {
  // ...existing fields...
  hidden: ({ user }) => user?.role !== 'admin',
},
```

If a config has no `admin` block, add the whole block.

This is UI-only — actual security is in the per-collection `access` rules (mostly admin-only by default).

- [ ] **Step 2: Hold commit for Task 8**

---

## Task 8: Generate types + create + apply migration

**Files:**
- Generated: `src/payload-types.ts`
- Generated: `src/migrations/<timestamp>_phase_3b_cart_orders.ts` (or similar)

- [ ] **Step 1: Regenerate Payload types**

Run from `repo/`:
```bash
npm run generate:types
```
Expected: writes `src/payload-types.ts`. Should now contain a `Cart` interface, updated `Order` interface with new fields, updated `User['role']` union including `'staff'`, updated `SiteSettings` with `payment` group + `notificationEmail`.

- [ ] **Step 2: Confirm Docker Postgres is running**

```bash
docker-compose up -d
docker-compose ps
```
Expected: postgres service status `running`.

- [ ] **Step 3: Create the migration**

```bash
npx payload migrate:create
```
Expected: prompts (or auto-names) a new file in `src/migrations/`. Inspect it — should contain:
- CREATE TABLE for `carts` + `carts_items`
- ALTER TYPE for `enum_users_role` adding `staff`
- ALTER TABLE for `orders` adding `preferred_date`, `customer_note`, `locale`, `qr_spayd` (column names will be snake_case from camelCase)
- ALTER TABLE for `site_settings` adding `notification_email` + the `payment_*` columns

- [ ] **Step 4: Apply the migration**

```bash
npx payload migrate
```
Expected: "Migration <name> applied successfully".

If you hit the migration-table desync problem from prod (see memory `migration_table_desync.md`), local is unaffected — this only bites on Neon prod and is handled at deploy time.

- [ ] **Step 5: Verify schema by running the app**

```bash
npm run dev
```
- Open http://localhost:3000/admin.
- Log in as admin.
- Confirm Carts collection appears in the sidebar.
- Open SiteSettings → `payment` group visible, fields editable. **Fill in real FIO test values** (or any valid CZ account format) so the QR flow has data to work with:
  - `accountPrefix`: (your choice, can be empty)
  - `accountNumber`: e.g. `2901234567`
  - `bankCode`: `2010`
  - `bankName`: `FIO banka` (default)
- Also fill `notificationEmail` with your own email so you receive staff notifications during testing.

Stop the dev server when done.

- [ ] **Step 6: Suggested commit**

```bash
git add src/collections/ src/globals/ src/payload.config.ts src/payload-types.ts src/migrations/
git commit -m "feat(orders,carts): schema, access, staff role"
```

---

## Task 9: getOrCreateCart helper

**Files:**
- Create: `src/lib/cart/getOrCreateCart.ts`

- [ ] **Step 1: Write the helper**

```ts
import type { Payload } from 'payload'
import type { Cart } from '@/payload-types'

export async function getOrCreateCart(payload: Payload, userId: number | string): Promise<Cart> {
  const found = await payload.find({
    collection: 'carts',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 2,
  })
  if (found.docs[0]) return found.docs[0]

  return payload.create({
    collection: 'carts',
    data: { user: userId as number, items: [] },
    depth: 2,
  })
}
```

- [ ] **Step 2: Suggested commit**

```bash
git add src/lib/cart/
git commit -m "feat(cart): getOrCreateCart helper"
```

---

## Task 10: CZ IBAN derivation

**Files:**
- Create: `src/lib/payment/iban.ts`

- [ ] **Step 1: Write the helper**

```ts
/**
 * Derives a Czech IBAN from local account components.
 * BBAN structure (20 digits): bankCode(4) + prefix(6, left-padded) + account(10, left-padded).
 * Check digits: ISO 13616, mod 97. CZ → numeric 1235.
 */
export function deriveCzIban(
  prefix: string | undefined | null,
  account: string,
  bankCode: string,
): string {
  const cleanedPrefix = (prefix ?? '').replace(/\D/g, '')
  const cleanedAccount = account.replace(/\D/g, '')
  const cleanedBankCode = bankCode.replace(/\D/g, '')

  if (cleanedAccount.length === 0 || cleanedBankCode.length !== 4) {
    throw new Error('deriveCzIban: invalid input (account empty or bankCode not 4 digits)')
  }

  const p = cleanedPrefix.padStart(6, '0')
  const a = cleanedAccount.padStart(10, '0')
  const b = cleanedBankCode.padStart(4, '0')

  const bban = `${b}${p}${a}` // 20 digits
  const remainder = Number(BigInt(`${bban}123500`) % 97n)
  const check = String(98 - remainder).padStart(2, '0')

  return `CZ${check}${bban}` // 24 chars
}
```

- [ ] **Step 2: Quick sanity check at the REPL**

From `repo/`:
```bash
node --experimental-strip-types -e "import('./src/lib/payment/iban.ts').then(m => console.log(m.deriveCzIban('', '2901234567', '2010')))"
```
Expected: a 24-char string starting with `CZ` followed by two check digits, then `20100000002901234567`.

If your Node doesn't support `--experimental-strip-types`, do a quick `tsc` compile of just this file or convert to JS in your head and run the function manually in `node`. Alternatively skip the smoke test — Task 28 will exercise this through the full UI.

- [ ] **Step 3: Suggested commit**

```bash
git add src/lib/payment/iban.ts
git commit -m "feat(payment): CZ IBAN derivation helper"
```

---

## Task 11: SPAYD builder + diacritic stripper

**Files:**
- Create: `src/lib/payment/spayd.ts`

- [ ] **Step 1: Write the helper**

```ts
function stripDiacritics(s: string): string {
  // NFD splits accented chars into base + combining marks, then strip the combining-marks block.
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function ascii(s: string): string {
  return stripDiacritics(s).replace(/[^\x20-\x7E]/g, '')
}

/**
 * CZ QR Platba (SPAYD v1.0) string.
 * https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 */
export function buildSpayd(input: {
  iban: string             // e.g. CZ6520100000002901234567
  amount: number           // CZK, e.g. 1234.5
  variableSymbol: string   // numeric, ≤ 10 digits
  message: string          // free-form — will be ASCII-stripped + truncated to 60 chars
}): string {
  const amt = input.amount.toFixed(2)
  const msg = ascii(input.message).slice(0, 60)
  const vs = input.variableSymbol.replace(/\D/g, '').slice(0, 10)
  return `SPD*1.0*ACC:${input.iban}*AM:${amt}*CC:CZK*X-VS:${vs}*MSG:${msg}`
}
```

- [ ] **Step 2: Suggested commit**

```bash
git add src/lib/payment/spayd.ts
git commit -m "feat(payment): SPAYD string builder"
```

---

## Task 12: QR PNG renderer + dependency

**Files:**
- Create: `src/lib/payment/qr.ts`
- Modify: `package.json` (via `npm install`)

- [ ] **Step 1: Install qrcode**

```bash
npm install qrcode
npm install -D @types/qrcode
```

- [ ] **Step 2: Write the helper**

`src/lib/payment/qr.ts`:

```ts
import QRCode from 'qrcode'

export async function renderQrPng(spayd: string): Promise<Buffer> {
  return QRCode.toBuffer(spayd, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#1f2937',
      light: '#ffffff',
    },
  })
}

export async function renderQrDataUrl(spayd: string): Promise<string> {
  return QRCode.toDataURL(spayd, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#1f2937', light: '#ffffff' },
  })
}
```

- [ ] **Step 3: Suggested commit**

```bash
git add src/lib/payment/qr.ts package.json package-lock.json
git commit -m "feat(payment): QR PNG/data-URL renderer + qrcode dep"
```

---

## Task 13: orderNumber generator

**Files:**
- Create: `src/lib/orders/orderNumber.ts`

- [ ] **Step 1: Write the generator**

```ts
import type { Payload } from 'payload'

const PREFIX_LEN = 4   // YYYY
const SEQ_LEN = 6      // NNNNNN
const TOTAL_LEN = PREFIX_LEN + SEQ_LEN

/**
 * Returns the next available orderNumber in the form YYYYNNNNNN (10 digits).
 * Sequence resets each calendar year.
 * Note: not concurrency-safe — acceptable at single-staff launch volume.
 */
export async function generateOrderNumber(payload: Payload, now: Date = new Date()): Promise<string> {
  const year = String(now.getUTCFullYear())
  const yearPrefix = year.slice(0, PREFIX_LEN)

  const last = await payload.find({
    collection: 'orders',
    where: { orderNumber: { like: `${yearPrefix}%` } },
    sort: '-orderNumber',
    limit: 1,
    depth: 0,
  })

  let nextSeq = 1
  if (last.docs[0]) {
    const lastNum = String(last.docs[0].orderNumber)
    const lastSeq = parseInt(lastNum.slice(PREFIX_LEN), 10)
    if (Number.isFinite(lastSeq)) nextSeq = lastSeq + 1
  }

  if (nextSeq >= 10 ** SEQ_LEN) {
    throw new Error(`Order sequence exhausted for ${year} — more than ${10 ** SEQ_LEN} orders this year`)
  }

  return `${yearPrefix}${String(nextSeq).padStart(SEQ_LEN, '0')}`
}
```

- [ ] **Step 2: Suggested commit**

```bash
git add src/lib/orders/orderNumber.ts
git commit -m "feat(orders): YYYYNNNNNN order number generator"
```

---

## Task 14: Refactor email shell + verify/forgot templates

**Files:**
- Modify: `src/lib/email/templates.ts`

- [ ] **Step 1: Update `wrap()` for shared shell**

The existing `wrap()` is already reusable. Confirm it stays the standard shell (brand color #2d5016, max-width 560px, white card, footer). If it differs, normalize to:

```ts
function wrap(locale: 'cs' | 'en', body: string): string {
  const tagline = locale === 'en' ? 'Czech country farm' : 'Český statek'
  return `<!DOCTYPE html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#f6f3eb;font-family:system-ui,-apple-system,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;">
      <div style="font-weight:800;font-size:20px;color:#2d5016;margin-bottom:24px;">Kurník Šopa</div>
      ${body}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
        Kurník Šopa · ${tagline}
      </div>
    </div>
  </div>
</body>
</html>`
}
```

The verify and forgot templates already use this; no functional change needed beyond consistency check.

- [ ] **Step 2: Suggested commit (skip if no diff)**

```bash
# only if templates.ts changed
git add src/lib/email/templates.ts
git commit -m "refactor(email): consistent shell helper"
```

---

## Task 15: Order confirmation email template

**Files:**
- Modify: `src/lib/email/templates.ts`

- [ ] **Step 1: Export the order-confirmation template**

Append to `src/lib/email/templates.ts`:

```ts
type CzAccount = { prefix?: string | null; account: string; bankCode: string; bankName?: string | null }

export type OrderConfirmationInput = {
  locale: 'cs' | 'en'
  orderNumber: string
  customerFirstName?: string | null
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; unit?: string | null }>
  totalAmount: number
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; zip: string } | null
  farmAddress: { street: string; city: string; zip: string }
  farmPhone?: string | null
  farmOpeningHours?: string | null
  preferredDate?: string | null    // pre-formatted, locale-specific
  customerNote?: string | null
  paymentMethod: 'bank_transfer' | 'cash_on_delivery'
  bank?: { account: CzAccount; iban: string; amountFormatted: string; vs: string; messageForRecipient: string } | null
  ownerName: string
  hasQrCid: boolean    // true when the caller will attach a cid:order-qr image
}

const ocCopy = {
  cs: {
    subject: (n: string) => `Objednávka č. ${n} přijata`,
    greeting: (name?: string | null) => name ? `Dobrý den ${name},` : 'Dobrý den,',
    intro: 'Děkujeme za objednávku v Kurníku Šopa. Níže najdete shrnutí a pokyny k platbě.',
    summaryTitle: 'Vaše objednávka',
    deliveryTitle: 'Doručení',
    paymentTitle: 'Platba',
    pickup: 'Osobní odběr',
    delivery: 'Doručení',
    deliveryFree: 'Zdarma v rámci regionu',
    pickupAt: (addr: string, hours: string | null | undefined, phone: string | null | undefined) =>
      `Osobní odběr na adrese: ${addr}.${hours ? ` Otevírací doba: ${hours}.` : ''}${phone ? ` Tel.: ${phone}.` : ''}`,
    deliveryTo: (addr: string) => `Doručíme na: ${addr}. Doprava zdarma v rámci regionu.`,
    preferredDateLabel: (d: string) => `Preferované datum: ${d}`,
    customerNoteLabel: (n: string) => `Poznámka: ${n}`,
    bankPrompt: (amt: string) => `Prosíme uhraďte částku <strong>${amt}</strong> převodem na náš účet.`,
    bankScan: 'Naskenujte QR kód v aplikaci své banky:',
    bankManual: 'Pokud váš banking nepodporuje QR, vyplňte údaje ručně:',
    cashPay: (amt: string) => `Částku <strong>${amt}</strong> uhradíte v hotovosti při odběru / doručení.`,
    accountLabel: 'Číslo účtu',
    bankLabel: 'Banka',
    vsLabel: 'Variabilní symbol',
    amountLabel: 'Částka',
    messageLabel: 'Zpráva pro příjemce',
    closing: (owner: string) => `Brzy se vám ozveme.<br/>S pozdravem,<br/><strong>${owner}</strong>`,
    qty: 'Množství',
    unitPrice: 'Cena/ks',
    lineTotal: 'Celkem',
    total: 'Celkem',
  },
  en: {
    subject: (n: string) => `Order #${n} received`,
    greeting: (name?: string | null) => name ? `Hello ${name},` : 'Hello,',
    intro: 'Thanks for your order at Kurník Šopa. Below is the summary and payment instructions.',
    summaryTitle: 'Your order',
    deliveryTitle: 'Delivery',
    paymentTitle: 'Payment',
    pickup: 'Pickup at farm',
    delivery: 'Delivery',
    deliveryFree: 'Free within region',
    pickupAt: (addr: string, hours: string | null | undefined, phone: string | null | undefined) =>
      `Pickup at: ${addr}.${hours ? ` Opening hours: ${hours}.` : ''}${phone ? ` Phone: ${phone}.` : ''}`,
    deliveryTo: (addr: string) => `We'll deliver to: ${addr}. Free delivery within region.`,
    preferredDateLabel: (d: string) => `Preferred date: ${d}`,
    customerNoteLabel: (n: string) => `Note: ${n}`,
    bankPrompt: (amt: string) => `Please pay <strong>${amt}</strong> by bank transfer to our account.`,
    bankScan: 'Scan the QR code in your banking app:',
    bankManual: "If your banking app doesn't support QR, enter the details manually:",
    cashPay: (amt: string) => `You'll pay <strong>${amt}</strong> in cash on pickup / delivery.`,
    accountLabel: 'Account number',
    bankLabel: 'Bank',
    vsLabel: 'Variable symbol',
    amountLabel: 'Amount',
    messageLabel: 'Message for recipient',
    closing: (owner: string) => `We'll be in touch soon.<br/>Regards,<br/><strong>${owner}</strong>`,
    qty: 'Quantity',
    unitPrice: 'Unit price',
    lineTotal: 'Total',
    total: 'Total',
  },
} as const

function fmtCzk(n: number): string {
  // Server-side; do not rely on Intl runtime variance. Group thousands with non-breaking spaces.
  const rounded = Math.round(n)
  return `${rounded.toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function fmtAddress(a: { street: string; city: string; zip: string }): string {
  return `${a.street}, ${a.zip} ${a.city}`
}

function fmtCzAccount(a: CzAccount): string {
  const left = a.prefix ? `${a.prefix.replace(/\D/g, '')}-` : ''
  return `${left}${a.account.replace(/\D/g, '')}/${a.bankCode.replace(/\D/g, '')}`
}

export function orderConfirmationSubject(input: OrderConfirmationInput): string {
  return ocCopy[input.locale].subject(input.orderNumber)
}

export function orderConfirmationTemplate(input: OrderConfirmationInput): string {
  const c = ocCopy[input.locale]

  const itemsHtml = input.items.map(it => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)}${it.unit ? ` <span style="color:#6b7280;">(${escapeHtml(it.unit)})</span>` : ''}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}×</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCzk(it.unitPrice)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>${fmtCzk(it.lineTotal)}</strong></td>
    </tr>`).join('')

  const summary = `
    <h2 style="font-size:18px;margin:24px 0 12px;">${c.summaryTitle}</h2>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="color:#6b7280;text-align:left;">
          <th style="padding:8px 4px;font-weight:500;">${c.summaryTitle}</th>
          <th style="padding:8px 4px;text-align:right;font-weight:500;">${c.qty}</th>
          <th style="padding:8px 4px;text-align:right;font-weight:500;">${c.unitPrice}</th>
          <th style="padding:8px 4px;text-align:right;font-weight:500;">${c.lineTotal}</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px 4px;text-align:right;"><strong>${c.total}</strong></td>
          <td style="padding:12px 4px;text-align:right;"><strong>${fmtCzk(input.totalAmount)}</strong></td>
        </tr>
      </tfoot>
    </table>`

  let deliveryBlock = `<h2 style="font-size:18px;margin:24px 0 12px;">${c.deliveryTitle}</h2>`
  if (input.deliveryMethod === 'pickup') {
    deliveryBlock += `<p style="margin:0 0 12px;font-size:14px;">${c.pickupAt(fmtAddress(input.farmAddress), input.farmOpeningHours ?? null, input.farmPhone ?? null)}</p>`
  } else if (input.deliveryAddress) {
    deliveryBlock += `<p style="margin:0 0 12px;font-size:14px;">${c.deliveryTo(fmtAddress(input.deliveryAddress))}</p>`
  }
  if (input.preferredDate) deliveryBlock += `<p style="margin:0 0 8px;font-size:14px;">${c.preferredDateLabel(escapeHtml(input.preferredDate))}</p>`
  if (input.customerNote)  deliveryBlock += `<p style="margin:0 0 8px;font-size:14px;">${c.customerNoteLabel(escapeHtml(input.customerNote))}</p>`

  let paymentBlock = `<h2 style="font-size:18px;margin:24px 0 12px;">${c.paymentTitle}</h2>`
  if (input.paymentMethod === 'bank_transfer' && input.bank) {
    const acc = fmtCzAccount(input.bank.account)
    const detailRow = (label: string, value: string) => `
      <tr>
        <td style="padding:6px 4px;color:#6b7280;font-size:14px;">${label}</td>
        <td style="padding:6px 4px;font-size:14px;"><strong>${escapeHtml(value)}</strong></td>
      </tr>`
    paymentBlock += `<p style="margin:0 0 12px;font-size:15px;">${c.bankPrompt(input.bank.amountFormatted)}</p>`
    if (input.hasQrCid) {
      paymentBlock += `
        <p style="margin:0 0 12px;font-size:14px;">${c.bankScan}</p>
        <p style="margin:0 0 16px;text-align:center;"><img src="cid:order-qr" width="280" height="280" alt="QR" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;"></p>
        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${c.bankManual}</p>`
    }
    paymentBlock += `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${detailRow(c.accountLabel, acc)}
        ${input.bank.account.bankName ? detailRow(c.bankLabel, input.bank.account.bankName) : ''}
        ${detailRow(c.amountLabel, input.bank.amountFormatted)}
        ${detailRow(c.vsLabel, input.bank.vs)}
        ${detailRow(c.messageLabel, input.bank.messageForRecipient)}
      </table>`
  } else if (input.paymentMethod === 'cash_on_delivery') {
    paymentBlock += `<p style="margin:0 0 8px;font-size:15px;">${c.cashPay(fmtCzk(input.totalAmount))}</p>`
  }

  const body = `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.customerFirstName ?? null)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${c.intro}</p>
    ${summary}
    ${deliveryBlock}
    ${paymentBlock}
    <p style="margin:24px 0 0;font-size:14px;">${c.closing(input.ownerName)}</p>
  `
  return wrap(input.locale, body)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch] as string)
}
```

- [ ] **Step 2: Suggested commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat(email): order confirmation template"
```

---

## Task 16: Staff notification + payment-received + order-shipped templates

**Files:**
- Modify: `src/lib/email/templates.ts`

- [ ] **Step 1: Add the three templates**

Append to `src/lib/email/templates.ts`:

```ts
// ─── Staff notification ─────────────────────────────────────────────────

export type StaffNotificationInput = {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  totalAmount: number
  deliveryMethod: 'pickup' | 'delivery' | 'balikovna'
  paymentMethod: 'bank_transfer' | 'cash_on_delivery' | 'stripe'
  deliveryAddress?: { street: string; city: string; zip: string } | null
  preferredDate?: string | null
  customerNote?: string | null
  items: Array<{ name: string; quantity: number; lineTotal: number }>
  adminUrl: string
}

export function staffNotificationSubject(input: StaffNotificationInput): string {
  return `Nová objednávka ${input.orderNumber} — ${input.customerName}`
}

export function staffNotificationTemplate(input: StaffNotificationInput): string {
  const items = input.items.map(it => `<tr>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)}</td>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}×</td>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCzk(it.lineTotal)}</td>
  </tr>`).join('')

  const deliveryLine = input.deliveryMethod === 'pickup'
    ? 'Osobní odběr'
    : input.deliveryAddress
      ? `Doručení na: ${escapeHtml(fmtAddress(input.deliveryAddress))}`
      : 'Doručení (adresa chybí)'

  const paymentLine = input.paymentMethod === 'bank_transfer'
    ? 'Bankovní převod (čeká na platbu)'
    : input.paymentMethod === 'cash_on_delivery'
      ? 'Hotově při odběru / doručení'
      : 'Karta (Stripe)'

  return wrap('cs', `
    <p style="margin:0 0 16px;font-size:16px;"><strong>Přišla nová objednávka.</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Číslo: <strong>${escapeHtml(input.orderNumber)}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Zákazník: ${escapeHtml(input.customerName)} (${escapeHtml(input.customerEmail)}${input.customerPhone ? `, ${escapeHtml(input.customerPhone)}` : ''})</p>
    <p style="margin:0 0 8px;font-size:14px;">Doručení: ${deliveryLine}</p>
    <p style="margin:0 0 8px;font-size:14px;">Platba: ${paymentLine}</p>
    ${input.preferredDate ? `<p style="margin:0 0 8px;font-size:14px;">Preferované datum: ${escapeHtml(input.preferredDate)}</p>` : ''}
    ${input.customerNote ? `<p style="margin:0 0 8px;font-size:14px;">Poznámka zákazníka: ${escapeHtml(input.customerNote)}</p>` : ''}
    <h2 style="font-size:16px;margin:20px 0 8px;">Položky</h2>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tbody>${items}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:8px 4px;text-align:right;"><strong>Celkem</strong></td>
        <td style="padding:8px 4px;text-align:right;"><strong>${fmtCzk(input.totalAmount)}</strong></td>
      </tr></tfoot>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${input.adminUrl}" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;">Otevřít v administraci</a>
    </p>
  `)
}

// ─── Payment received ───────────────────────────────────────────────────

export type PaymentReceivedInput = {
  locale: 'cs' | 'en'
  orderNumber: string
  customerFirstName?: string | null
  deliveryMethod: 'pickup' | 'delivery' | 'balikovna'
}

export function paymentReceivedSubject(i: PaymentReceivedInput): string {
  return i.locale === 'en' ? `Payment received for order #${i.orderNumber}` : `Platba k objednávce ${i.orderNumber} přijata`
}

export function paymentReceivedTemplate(i: PaymentReceivedInput): string {
  const isPickup = i.deliveryMethod === 'pickup'
  const body = i.locale === 'en'
    ? `<p style="margin:0 0 16px;">${i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,'}</p>
       <p style="margin:0 0 16px;">Thanks, we've received your payment for order <strong>#${i.orderNumber}</strong>. We're preparing your order now.</p>
       <p style="margin:0;">${isPickup ? "We'll send another email when your order is ready for pickup." : "We'll be in touch shortly to arrange delivery time."}</p>`
    : `<p style="margin:0 0 16px;">${i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,'}</p>
       <p style="margin:0 0 16px;">Děkujeme, platba k objednávce <strong>${i.orderNumber}</strong> dorazila. Vaši objednávku již připravujeme.</p>
       <p style="margin:0;">${isPickup ? 'Až bude objednávka připravená k odběru, dáme vědět dalším e-mailem.' : 'Brzy vás budeme kontaktovat ohledně termínu doručení.'}</p>`
  return wrap(i.locale, body)
}

// ─── Order shipped / ready ──────────────────────────────────────────────

export type OrderShippedInput = {
  locale: 'cs' | 'en'
  orderNumber: string
  customerFirstName?: string | null
  deliveryMethod: 'pickup' | 'delivery' | 'balikovna'
  farmAddress: { street: string; city: string; zip: string }
  farmPhone?: string | null
  farmOpeningHours?: string | null
}

export function orderShippedSubject(i: OrderShippedInput): string {
  if (i.deliveryMethod === 'pickup') {
    return i.locale === 'en' ? `Your order #${i.orderNumber} is ready for pickup` : `Vaše objednávka ${i.orderNumber} je připravena k odběru`
  }
  return i.locale === 'en' ? `Your order #${i.orderNumber} is on its way` : `Vaše objednávka ${i.orderNumber} je na cestě`
}

export function orderShippedTemplate(i: OrderShippedInput): string {
  const greet = i.locale === 'en'
    ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,')
    : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')

  let body = `<p style="margin:0 0 16px;">${greet}</p>`
  if (i.deliveryMethod === 'pickup') {
    const addr = fmtAddress(i.farmAddress)
    body += i.locale === 'en'
      ? `<p style="margin:0 0 16px;">Your order <strong>#${i.orderNumber}</strong> is ready for pickup.</p>
         <p style="margin:0 0 8px;">Address: <strong>${escapeHtml(addr)}</strong></p>
         ${i.farmOpeningHours ? `<p style="margin:0 0 8px;">Opening hours: ${escapeHtml(i.farmOpeningHours)}</p>` : ''}
         ${i.farmPhone ? `<p style="margin:0 0 8px;">Phone: ${escapeHtml(i.farmPhone)}</p>` : ''}`
      : `<p style="margin:0 0 16px;">Vaši objednávku <strong>${i.orderNumber}</strong> si můžete vyzvednout.</p>
         <p style="margin:0 0 8px;">Adresa: <strong>${escapeHtml(addr)}</strong></p>
         ${i.farmOpeningHours ? `<p style="margin:0 0 8px;">Otevírací doba: ${escapeHtml(i.farmOpeningHours)}</p>` : ''}
         ${i.farmPhone ? `<p style="margin:0 0 8px;">Tel.: ${escapeHtml(i.farmPhone)}</p>` : ''}`
  } else {
    body += i.locale === 'en'
      ? `<p style="margin:0 0 16px;">Your order <strong>#${i.orderNumber}</strong> is on its way. We'll contact you shortly with the delivery time.</p>`
      : `<p style="margin:0 0 16px;">Vaši objednávku <strong>${i.orderNumber}</strong> vezeme. Brzy vás budeme kontaktovat ohledně času doručení.</p>`
  }
  return wrap(i.locale, body)
}
```

- [ ] **Step 2: Suggested commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat(email): staff notification + payment-received + order-shipped templates"
```

---

## Task 17: placeOrder orchestrator

**Files:**
- Create: `src/lib/orders/placeOrder.ts`

- [ ] **Step 1: Write the orchestrator**

```ts
import type { Payload } from 'payload'
import type { Cart, Product, User, SiteSetting } from '@/payload-types'

import { generateOrderNumber } from './orderNumber'
import { deriveCzIban } from '@/lib/payment/iban'
import { buildSpayd } from '@/lib/payment/spayd'
import { renderQrPng } from '@/lib/payment/qr'
import {
  orderConfirmationSubject,
  orderConfirmationTemplate,
  staffNotificationSubject,
  staffNotificationTemplate,
  type OrderConfirmationInput,
  type StaffNotificationInput,
} from '@/lib/email/templates'

export type PlaceOrderInput = {
  user: User
  cart: Cart
  locale: 'cs' | 'en'
  customer: { firstName: string; lastName: string; phone: string }
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; zip: string } | null
  preferredDate: string   // ISO yyyy-mm-dd
  customerNote?: string | null
  paymentMethod: 'bank_transfer' | 'cash_on_delivery'
}

export type ValidationError = {
  productId: number | string
  productName: string
  code: 'outOfStock' | 'insufficientStock' | 'belowMinimumOrder' | 'outOfSeason' | 'productNotFound'
  min?: number
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; errors: ValidationError[]; reason?: 'paymentMethodMissingBankDetails' | 'cartEmpty' }

export async function placeOrder(payload: Payload, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.cart.items || input.cart.items.length === 0) {
    return { ok: false, errors: [], reason: 'cartEmpty' }
  }

  const productIds = input.cart.items.map(it =>
    typeof it.product === 'object' ? it.product.id : it.product,
  )
  const products = await payload.find({
    collection: 'products',
    where: { id: { in: productIds } },
    depth: 0,
    limit: productIds.length,
  })
  const byId = new Map<number, Product>(products.docs.map(p => [p.id as number, p]))

  // ── Validate stock ─────────────────────────────────────────────────────
  const errors: ValidationError[] = []
  const today = new Date()
  for (const item of input.cart.items) {
    const pid = (typeof item.product === 'object' ? item.product.id : item.product) as number
    const p = byId.get(pid)
    if (!p) { errors.push({ productId: pid, productName: '?', code: 'productNotFound' }); continue }
    const pname = (typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[input.locale]) ?? '?'
    if (!p.inStock) { errors.push({ productId: pid, productName: pname, code: 'outOfStock' }); continue }
    if (typeof p.stockQuantity === 'number' && p.stockQuantity < item.quantity) {
      errors.push({ productId: pid, productName: pname, code: 'insufficientStock' }); continue
    }
    if (typeof p.minimumOrder === 'number' && item.quantity < p.minimumOrder) {
      errors.push({ productId: pid, productName: pname, code: 'belowMinimumOrder', min: p.minimumOrder }); continue
    }
    if (p.seasonal) {
      const from = p.availableFrom ? new Date(p.availableFrom) : null
      const to   = p.availableTo   ? new Date(p.availableTo)   : null
      if ((from && today < from) || (to && today > to)) {
        errors.push({ productId: pid, productName: pname, code: 'outOfSeason' }); continue
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  // ── Load SiteSettings (for FIO + farm address + notification email) ────
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  if (input.paymentMethod === 'bank_transfer') {
    const pay = settings.payment
    if (!pay?.accountNumber || !pay?.bankCode) {
      return { ok: false, errors: [], reason: 'paymentMethodMissingBankDetails' }
    }
  }

  // ── Snapshot prices + total ────────────────────────────────────────────
  const items = input.cart.items.map(it => {
    const pid = (typeof it.product === 'object' ? it.product.id : it.product) as number
    const p = byId.get(pid)!
    return {
      product: pid,
      quantity: it.quantity,
      priceAtPurchase: p.price,
    }
  })
  const totalAmount = items.reduce((sum, it) => sum + it.priceAtPurchase * it.quantity, 0)

  const orderNumber = await generateOrderNumber(payload)

  // ── Compose SPAYD if bank_transfer ─────────────────────────────────────
  let qrSpayd: string | null = null
  let qrPng: Buffer | null = null
  if (input.paymentMethod === 'bank_transfer') {
    const pay = settings.payment!
    const iban = deriveCzIban(pay.accountPrefix ?? '', pay.accountNumber!, pay.bankCode!)
    qrSpayd = buildSpayd({
      iban,
      amount: totalAmount,
      variableSymbol: orderNumber,
      message: `Kurnik Sopa ${orderNumber}`,
    })
    qrPng = await renderQrPng(qrSpayd)
  }

  // ── Create the order ───────────────────────────────────────────────────
  const order = await payload.create({
    collection: 'orders',
    data: {
      orderNumber,
      customer: input.user.id as number,
      items,
      totalAmount,
      deliveryMethod: input.deliveryMethod,
      deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress ?? undefined : undefined,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'received',
      preferredDate: input.preferredDate,
      customerNote: input.customerNote ?? undefined,
      locale: input.locale,
      qrSpayd: qrSpayd ?? undefined,
    },
    depth: 0,
  })

  // ── Clear cart ─────────────────────────────────────────────────────────
  try {
    await payload.delete({ collection: 'carts', id: input.cart.id })
  } catch (e) {
    payload.logger.warn(`Failed to clear cart after order ${orderNumber}: ${String(e)}`)
  }

  // ── Send customer confirmation ─────────────────────────────────────────
  try {
    const itemsForEmail = items.map(it => {
      const p = byId.get(it.product as number)!
      const pname = (typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[input.locale]) ?? '?'
      return {
        name: pname,
        quantity: it.quantity,
        unitPrice: it.priceAtPurchase,
        lineTotal: it.priceAtPurchase * it.quantity,
        unit: p.unit ?? null,
      }
    })

    const ocInput: OrderConfirmationInput = {
      locale: input.locale,
      orderNumber,
      customerFirstName: input.user.firstName ?? null,
      items: itemsForEmail,
      totalAmount,
      deliveryMethod: input.deliveryMethod,
      deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress ?? null : null,
      farmAddress: {
        street: settings.address?.street ?? '',
        city:   settings.address?.city   ?? '',
        zip:    settings.address?.zip    ?? '',
      },
      farmPhone: settings.contact?.phone ?? null,
      farmOpeningHours: settings.openingHours ?? null,
      preferredDate: formatDateLocale(input.preferredDate, input.locale),
      customerNote: input.customerNote ?? null,
      paymentMethod: input.paymentMethod,
      bank: input.paymentMethod === 'bank_transfer' && qrSpayd
        ? {
            account: {
              prefix: settings.payment?.accountPrefix ?? null,
              account: settings.payment!.accountNumber!,
              bankCode: settings.payment!.bankCode!,
              bankName: settings.payment?.bankName ?? null,
            },
            iban: deriveCzIban(settings.payment?.accountPrefix ?? '', settings.payment!.accountNumber!, settings.payment!.bankCode!),
            amountFormatted: `${Math.round(totalAmount).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`,
            vs: orderNumber,
            messageForRecipient: `Kurnik Sopa ${orderNumber}`,
          }
        : null,
      ownerName: settings.owner ?? 'Kurník Šopa',
      hasQrCid: Boolean(qrPng),
    }

    const html = orderConfirmationTemplate(ocInput)
    const subject = orderConfirmationSubject(ocInput)
    const to = input.user.email

    const attachments = qrPng
      ? [{ filename: 'order-qr.png', content: qrPng, cid: 'order-qr', contentType: 'image/png' }]
      : undefined

    await payload.sendEmail({
      to,
      subject,
      html,
      replyTo: settings.contact?.email ?? undefined,
      attachments,
    } as Parameters<typeof payload.sendEmail>[0])
  } catch (e) {
    payload.logger.warn(`Failed to send order confirmation for ${orderNumber}: ${String(e)}`)
  }

  // ── Send staff notification ────────────────────────────────────────────
  try {
    if (settings.notificationEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const adminUrl = `${baseUrl}/admin/collections/orders/${order.id}`

      const sn: StaffNotificationInput = {
        orderNumber,
        customerName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
        customerEmail: input.user.email,
        customerPhone: input.customer.phone ?? null,
        totalAmount,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress ?? null : null,
        preferredDate: formatDateLocale(input.preferredDate, 'cs'),
        customerNote: input.customerNote ?? null,
        items: items.map(it => {
          const p = byId.get(it.product as number)!
          const pname = (typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.cs) ?? '?'
          return { name: pname, quantity: it.quantity, lineTotal: it.priceAtPurchase * it.quantity }
        }),
        adminUrl,
      }

      await payload.sendEmail({
        to: settings.notificationEmail,
        subject: staffNotificationSubject(sn),
        html: staffNotificationTemplate(sn),
        replyTo: input.user.email,
      } as Parameters<typeof payload.sendEmail>[0])
    } else {
      payload.logger.warn(`No SiteSettings.notificationEmail set — skipping staff notification for ${orderNumber}`)
    }
  } catch (e) {
    payload.logger.warn(`Failed to send staff notification for ${orderNumber}: ${String(e)}`)
  }

  return { ok: true, orderNumber }
}

function formatDateLocale(iso: string, locale: 'cs' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}
```

If `payload.sendEmail`'s type doesn't accept `attachments` / `replyTo` / `cid` directly, the cast `as Parameters<typeof payload.sendEmail>[0]` is intentional — these are passed through to the Resend adapter (which wraps nodemailer under the hood). If at runtime the QR doesn't appear inline, switch the attachment shape to `{ filename, content, content_id, type }` (Resend's native form) per their SDK docs.

- [ ] **Step 2: Suggested commit**

```bash
git add src/lib/orders/placeOrder.ts
git commit -m "feat(orders): placeOrder orchestrator (validation, snapshot, emails)"
```

---

## Task 18: Order placement endpoint

**Files:**
- Create: `src/collections/Orders/endpoints/placeOrder.ts`
- Modify: `src/collections/Orders/index.ts` (already registered import in Task 6; verify path)

- [ ] **Step 1: Write the endpoint**

```ts
import type { Endpoint, PayloadRequest } from 'payload'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { placeOrder } from '@/lib/orders/placeOrder'

type Body = {
  customer: { firstName: string; lastName: string; phone: string }
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; zip: string }
  preferredDate: string
  customerNote?: string
  paymentMethod: 'bank_transfer' | 'cash_on_delivery'
  locale: 'cs' | 'en'
}

function isBody(v: unknown): v is Body {
  if (!v || typeof v !== 'object') return false
  const b = v as Record<string, unknown>
  const c = b.customer as Record<string, unknown> | undefined
  return (
    !!c && typeof c.firstName === 'string' && typeof c.lastName === 'string' && typeof c.phone === 'string' &&
    (b.deliveryMethod === 'pickup' || b.deliveryMethod === 'delivery') &&
    typeof b.preferredDate === 'string' &&
    (b.paymentMethod === 'bank_transfer' || b.paymentMethod === 'cash_on_delivery') &&
    (b.locale === 'cs' || b.locale === 'en')
  )
}

export const placeOrderEndpoint: Endpoint = {
  path: '/place',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) {
      return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }
    if (!isBody(body)) {
      return Response.json({ ok: false, reason: 'invalidBody' }, { status: 400 })
    }

    if (body.deliveryMethod === 'delivery') {
      const a = body.deliveryAddress
      if (!a || !a.street || !a.city || !a.zip) {
        return Response.json({ ok: false, reason: 'invalidAddress' }, { status: 400 })
      }
    }

    const cart = await getOrCreateCart(req.payload, req.user.id)
    const result = await placeOrder(req.payload, {
      user: req.user,
      cart,
      locale: body.locale,
      customer: body.customer,
      deliveryMethod: body.deliveryMethod,
      deliveryAddress: body.deliveryMethod === 'delivery' ? body.deliveryAddress! : null,
      preferredDate: body.preferredDate,
      customerNote: body.customerNote,
      paymentMethod: body.paymentMethod,
    })

    if (!result.ok) {
      // Validation errors → 409 so the client can distinguish stock issues from auth/format
      return Response.json(result, { status: result.errors.length > 0 ? 409 : 400 })
    }
    return Response.json(result, { status: 200 })
  },
}
```

- [ ] **Step 2: Confirm registration in Orders collection**

In `src/collections/Orders/index.ts`, the imports added in Task 6 should now resolve:

```ts
import { placeOrderEndpoint } from './endpoints/placeOrder'
```

And the `endpoints: [placeOrderEndpoint]` on the collection should typecheck.

- [ ] **Step 3: Suggested commit**

```bash
git add src/collections/Orders/endpoints/ src/collections/Orders/index.ts
git commit -m "feat(orders): POST /api/orders/place endpoint"
```

---

## Task 19: Order status afterChange hook (payment received + shipped emails)

**Files:**
- Create: `src/collections/Orders/hooks/sendStatusEmails.ts`

- [ ] **Step 1: Write the hook**

```ts
import type { CollectionAfterChangeHook } from 'payload'
import {
  paymentReceivedSubject,
  paymentReceivedTemplate,
  orderShippedSubject,
  orderShippedTemplate,
  type PaymentReceivedInput,
  type OrderShippedInput,
} from '@/lib/email/templates'
import type { SiteSetting, User } from '@/payload-types'

export const sendStatusEmails: CollectionAfterChangeHook = async ({
  doc, previousDoc, operation, req,
}) => {
  if (operation !== 'update') return doc
  if (!previousDoc) return doc

  const customerId = typeof doc.customer === 'object' ? doc.customer?.id : doc.customer
  if (!customerId) return doc

  let customer: User
  try {
    customer = (await req.payload.findByID({ collection: 'users', id: customerId, depth: 0 })) as User
  } catch {
    return doc
  }
  const settings = (await req.payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  const locale = (doc.locale === 'en' || doc.locale === 'cs') ? doc.locale : 'cs'

  // Payment received
  if (previousDoc.paymentStatus !== 'paid' && doc.paymentStatus === 'paid') {
    const input: PaymentReceivedInput = {
      locale,
      orderNumber: String(doc.orderNumber),
      customerFirstName: customer.firstName ?? null,
      deliveryMethod: doc.deliveryMethod,
    }
    try {
      await req.payload.sendEmail({
        to: customer.email,
        subject: paymentReceivedSubject(input),
        html: paymentReceivedTemplate(input),
        replyTo: settings.contact?.email ?? undefined,
      } as Parameters<typeof req.payload.sendEmail>[0])
    } catch (e) {
      req.payload.logger.warn(`Failed to send payment-received email for ${doc.orderNumber}: ${String(e)}`)
    }
  }

  // Order shipped / ready
  if (previousDoc.orderStatus !== doc.orderStatus && doc.orderStatus === 'shipped') {
    const input: OrderShippedInput = {
      locale,
      orderNumber: String(doc.orderNumber),
      customerFirstName: customer.firstName ?? null,
      deliveryMethod: doc.deliveryMethod,
      farmAddress: {
        street: settings.address?.street ?? '',
        city:   settings.address?.city   ?? '',
        zip:    settings.address?.zip    ?? '',
      },
      farmPhone: settings.contact?.phone ?? null,
      farmOpeningHours: settings.openingHours ?? null,
    }
    try {
      await req.payload.sendEmail({
        to: customer.email,
        subject: orderShippedSubject(input),
        html: orderShippedTemplate(input),
        replyTo: settings.contact?.email ?? undefined,
      } as Parameters<typeof req.payload.sendEmail>[0])
    } catch (e) {
      req.payload.logger.warn(`Failed to send order-shipped email for ${doc.orderNumber}: ${String(e)}`)
    }
  }

  return doc
}
```

- [ ] **Step 2: Confirm registration in Orders collection**

From Task 6, this should already be in the collection:

```ts
hooks: { afterChange: [sendStatusEmails] },
```

Run `npm run dev` and verify Payload boots clean — no missing import errors.

- [ ] **Step 3: Suggested commit**

```bash
git add src/collections/Orders/hooks/
git commit -m "feat(orders): status-change email hook"
```

---

## Task 20: /kosik page becomes real

**Files:**
- Modify: `src/app/(frontend)/[locale]/kosik/page.tsx`

- [ ] **Step 1: Replace the placeholder with a real cart page**

```tsx
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { toastQuery } from '@/lib/toast-keys'
import { getTranslations } from 'next-intl/server'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { CartView } from '@/components/cart/CartView'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CartPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect({
      href: { pathname: '/registrace', query: toastQuery('loginRequiredCart', 'info') },
      locale,
    })
  }

  const cart = await getOrCreateCart(payload, user!.id)
  const t = await getTranslations({ locale, namespace: 'cart' })

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <CartView cart={cart} locale={locale} />
    </div>
  )
}
```

- [ ] **Step 2: Suggested commit (held until Task 21)**

---

## Task 21: CartView component

**Files:**
- Create: `src/components/cart/CartView.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/lib/i18n/routing'
import type { Cart, Product, Media } from '@/payload-types'

type Props = {
  cart: Cart
  locale: 'cs' | 'en'
}

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function getProductName(p: Product | number, locale: 'cs' | 'en'): string {
  if (typeof p !== 'object') return '?'
  if (typeof p.name === 'string') return p.name
  return (p.name as Record<string, string>)?.[locale] ?? '?'
}

function getProductImage(p: Product | number): string | null {
  if (typeof p !== 'object' || !p.images || !Array.isArray(p.images) || p.images.length === 0) return null
  const first = p.images[0]
  if (!first || typeof first !== 'object') return null
  const image = (first as { image?: Media | number }).image
  if (!image || typeof image !== 'object') return null
  return image.url ?? null
}

export function CartView({ cart, locale }: Props) {
  const t = useTranslations('cart')
  const router = useRouter()
  const [items, setItems] = useState(cart.items ?? [])
  const [submitting, startTransition] = useTransition()

  const subtotal = items.reduce((sum, it) => {
    const p = it.product as Product | number
    const price = typeof p === 'object' ? p.price : 0
    return sum + price * it.quantity
  }, 0)

  function persist(nextItems: typeof items) {
    setItems(nextItems)
    startTransition(async () => {
      const res = await fetch(`/api/carts/${cart.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: nextItems.map(it => ({
            product: typeof it.product === 'object' ? it.product.id : it.product,
            quantity: it.quantity,
          })),
        }),
      })
      if (res.ok) router.refresh()
    })
  }

  function updateQty(idx: number, qty: number) {
    if (qty < 1) return
    const next = items.map((it, i) => i === idx ? { ...it, quantity: qty } : it)
    persist(next)
  }

  function remove(idx: number) {
    persist(items.filter((_, i) => i !== idx))
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-semibold">{t('empty.title')}</h2>
        <p className="text-text-secondary">{t('empty.body')}</p>
        <Link href="/produkty" className="inline-block bg-brand text-white px-6 py-3 rounded-lg font-medium">
          {t('empty.cta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-gray-200">
        {items.map((it, idx) => {
          const p = it.product as Product | number
          const name = getProductName(p, locale)
          const img = getProductImage(p)
          const unitPrice = typeof p === 'object' ? p.price : 0
          const minOrder = typeof p === 'object' ? (p.minimumOrder ?? 1) : 1
          return (
            <li key={idx} className="py-4 flex gap-4 items-center">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {img && <Image src={img} alt={name} width={80} height={80} className="object-cover w-full h-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-sm text-text-secondary">{formatCzk(unitPrice)}{typeof p === 'object' && p.unit ? ` / ${p.unit}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(idx, Math.max(minOrder, it.quantity - 1))}
                  disabled={submitting || it.quantity <= minOrder}
                  aria-label={t('lineItem.qty')}
                  className="w-8 h-8 rounded border border-gray-300 disabled:opacity-30"
                >−</button>
                <span className="w-8 text-center">{it.quantity}</span>
                <button
                  onClick={() => updateQty(idx, it.quantity + 1)}
                  disabled={submitting}
                  aria-label={t('lineItem.qty')}
                  className="w-8 h-8 rounded border border-gray-300 disabled:opacity-30"
                >+</button>
              </div>
              <div className="w-24 text-right font-semibold">{formatCzk(unitPrice * it.quantity)}</div>
              <button
                onClick={() => remove(idx)}
                disabled={submitting}
                className="text-sm text-red-700 hover:underline"
              >{t('lineItem.remove')}</button>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('summary.subtotal')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('summary.shipping')}</span>
          <span>{t('summary.shippingFree')}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span>{t('summary.total')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
      </div>

      <Link href="/pokladna" className="block w-full text-center bg-brand text-white py-3 rounded-lg font-semibold">
        {t('cta.checkout')}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Smoke check**

Run `npm run dev`. Log in, navigate to `/cs/kosik`. With an empty cart, the empty state shows. With a cart that has items (you can add via /admin manually to test before Task 22 lands the add-to-cart button), the list, quantity controls, and checkout CTA render.

- [ ] **Step 3: Suggested commit**

```bash
git add src/app/\(frontend\)/\[locale\]/kosik/ src/components/cart/CartView.tsx
git commit -m "feat(cart): /kosik page + CartView component"
```

---

## Task 22: AddToCartButton component + product detail integration

**Files:**
- Create: `src/components/cart/AddToCartButton.tsx`
- Modify: the product detail page/component that renders product detail (look in `src/components/products/` and `src/app/(frontend)/[locale]/produkty/[slug]/page.tsx`)

- [ ] **Step 1: Write the button component**

`src/components/cart/AddToCartButton.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/routing'

type Props = {
  productId: number
  productName: string
  minimumOrder?: number
  isLoggedIn: boolean
  loginRedirectPath: string
}

export function AddToCartButton({ productId, productName, minimumOrder = 1, isLoggedIn, loginRedirectPath }: Props) {
  const t = useTranslations('cart')
  const tNav = useTranslations('nav.cart')
  const router = useRouter()
  const [qty, setQty] = useState(minimumOrder)
  const [submitting, startTransition] = useTransition()

  function add() {
    if (!isLoggedIn) {
      toast.info(t('added.toast'), {
        description: undefined,
        action: { label: t('added.action'), onClick: () => router.push(`/prihlaseni?next=${encodeURIComponent(loginRedirectPath)}`) },
      })
      router.push(`/prihlaseni?next=${encodeURIComponent(loginRedirectPath)}`)
      return
    }
    startTransition(async () => {
      // 1) GET current cart for this user
      const meRes = await fetch('/api/users/me', { credentials: 'include' })
      const me = (await meRes.json()) as { user?: { id: number } }
      const userId = me.user?.id
      if (!userId) {
        router.push('/prihlaseni')
        return
      }

      const cartRes = await fetch(`/api/carts?where[user][equals]=${userId}&depth=0`, { credentials: 'include' })
      const cartJson = (await cartRes.json()) as { docs: Array<{ id: number; items?: Array<{ product: number; quantity: number }> }> }
      let cartId = cartJson.docs[0]?.id

      const existingItems = cartJson.docs[0]?.items ?? []
      const existingIdx = existingItems.findIndex((it) => it.product === productId)
      const nextItems = [...existingItems]
      if (existingIdx >= 0) {
        nextItems[existingIdx] = { ...nextItems[existingIdx], quantity: nextItems[existingIdx].quantity + qty }
      } else {
        nextItems.push({ product: productId, quantity: qty })
      }

      if (!cartId) {
        // Create cart
        const created = await fetch('/api/carts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ user: userId, items: nextItems }),
        })
        const createdJson = (await created.json()) as { doc?: { id: number } }
        cartId = createdJson.doc?.id
      } else {
        await fetch(`/api/carts/${cartId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items: nextItems }),
        })
      }

      toast.success(t('added.toast'), {
        description: `${productName} × ${qty}`,
        action: { label: t('added.action'), onClick: () => router.push('/kosik') },
      })
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
        <button
          onClick={() => setQty(Math.max(minimumOrder, qty - 1))}
          disabled={qty <= minimumOrder}
          aria-label={t('lineItem.qty')}
          className="w-10 h-10 disabled:opacity-30"
        >−</button>
        <span className="w-10 text-center">{qty}</span>
        <button
          onClick={() => setQty(qty + 1)}
          aria-label={t('lineItem.qty')}
          className="w-10 h-10"
        >+</button>
      </div>
      <button
        onClick={add}
        disabled={submitting}
        className="flex-1 bg-brand text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-60"
      >
        {t('added.toast').replace('Přidáno do', 'Přidat do').replace('Added to', 'Add to')}
      </button>
    </div>
  )
}
```

The label hack on the last line is intentional pragma — if you'd like a clean key, add `cart.actions.addToCart` to messages, but the existing `added.toast` already covers most of what we need; either path is fine for launch.

- [ ] **Step 2: Embed in product detail**

Find the product detail render — likely `src/components/products/ProductDetail.tsx` or inline in `src/app/(frontend)/[locale]/produkty/[slug]/page.tsx`. Add:

```tsx
import { AddToCartButton } from '@/components/cart/AddToCartButton'
// ... within the render, where price/CTA goes:
<AddToCartButton
  productId={product.id}
  productName={localizedName}
  minimumOrder={product.minimumOrder ?? 1}
  isLoggedIn={Boolean(user)}
  loginRedirectPath={`/produkty/${product.slug}`}
/>
```

The product detail page Server Component already resolves `user` via `payload.auth` — pass it as a prop.

- [ ] **Step 3: Suggested commit**

```bash
git add src/components/cart/AddToCartButton.tsx src/components/products/ src/app/\(frontend\)/\[locale\]/produkty/
git commit -m "feat(cart): add-to-cart button on product detail"
```

---

## Task 23: CartBadge in HeaderUserMenu

**Files:**
- Create: `src/components/cart/CartBadge.tsx`
- Modify: `src/components/layout/HeaderUserMenu.tsx`

- [ ] **Step 1: Write CartBadge (Server Component)**

`src/components/cart/CartBadge.tsx`:

```tsx
import { Link } from '@/lib/i18n/routing'
import { getTranslations } from 'next-intl/server'
import type { Cart } from '@/payload-types'

type Props = { cart: Cart | null; locale: 'cs' | 'en' }

export async function CartBadge({ cart, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'nav.cart' })
  const count = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0

  return (
    <Link href="/kosik" className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10" aria-label={t('cart')}>
      <span aria-hidden="true">🛒</span>
      <span className="hidden sm:inline">{t('cart')}</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand text-white text-xs rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  )
}
```

If the project has a real cart-icon SVG, swap the `🛒` for it. Don't block on icon polish.

- [ ] **Step 2: Embed in HeaderUserMenu**

In `src/components/layout/HeaderUserMenu.tsx`, where the user gets resolved, also fetch the cart and pass it through:

```tsx
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { CartBadge } from '@/components/cart/CartBadge'

// ... inside the async Server Component, after auth():
const cart = user ? await getOrCreateCart(payload, user.id) : null

// ... within the rendered JSX:
{user && <CartBadge cart={cart} locale={locale} />}
```

If the existing HeaderUserMenu doesn't take `locale` already, add it as a prop and pass it from the Header.

- [ ] **Step 3: Suggested commit**

```bash
git add src/components/cart/CartBadge.tsx src/components/layout/HeaderUserMenu.tsx
git commit -m "feat(cart): header cart badge"
```

---

## Task 24: /pokladna page

**Files:**
- Create: `src/app/(frontend)/[locale]/pokladna/page.tsx`

- [ ] **Step 1: Write the Server Component**

```tsx
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from '@/lib/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { getOrCreateCart } from '@/lib/cart/getOrCreateCart'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import type { SiteSetting } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en' }> }

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect({ href: '/prihlaseni', locale })
  }

  const cart = await getOrCreateCart(payload, user!.id)
  if (!cart.items || cart.items.length === 0) {
    redirect({ href: '/kosik', locale })
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting
  const t = await getTranslations({ locale, namespace: 'checkout' })

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <CheckoutForm
        cart={cart}
        user={{
          id: user!.id,
          email: user!.email,
          firstName: user!.firstName ?? '',
          lastName: user!.lastName ?? '',
          phone: user!.phone ?? '',
          addresses: user!.addresses ?? [],
        }}
        farm={{
          address: settings.address ?? { street: '', city: '', zip: '' },
          phone: settings.contact?.phone ?? null,
          openingHours: settings.openingHours ?? null,
        }}
        bankConfigured={Boolean(settings.payment?.accountNumber && settings.payment?.bankCode)}
        locale={locale}
      />
    </div>
  )
}
```

- [ ] **Step 2: Hold commit until Task 25**

---

## Task 25: CheckoutForm component

**Files:**
- Create: `src/components/checkout/CheckoutForm.tsx`

- [ ] **Step 1: Write the form**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/routing'
import type { Cart, Product } from '@/payload-types'

const ZIP_RE = /^\d{3}\s?\d{2}$/

type Address = { street: string; city: string; zip: string; label?: string | null }

type Props = {
  cart: Cart
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    phone: string
    addresses: Array<Address & { id?: string | null }>
  }
  farm: { address: { street: string; city: string; zip: string }; phone: string | null; openingHours: string | null }
  bankConfigured: boolean
  locale: 'cs' | 'en'
}

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

export function CheckoutForm({ cart, user, farm, bankConfigured, locale }: Props) {
  const t = useTranslations('checkout')
  const tCart = useTranslations('cart')
  const router = useRouter()

  const defaultAddr = user.addresses[0] ?? null

  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [phone, setPhone] = useState(user.phone)
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [useOther, setUseOther] = useState(false)
  const [street, setStreet] = useState(defaultAddr?.street ?? '')
  const [city, setCity] = useState(defaultAddr?.city ?? '')
  const [zip, setZip] = useState(defaultAddr?.zip ?? '')
  const [preferredDate, setPreferredDate] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash_on_delivery'>('bank_transfer')
  const [agreement, setAgreement] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)

  const subtotal = (cart.items ?? []).reduce((sum, it) => {
    const p = it.product as Product | number
    return sum + (typeof p === 'object' ? p.price : 0) * it.quantity
  }, 0)

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'required'
    if (!lastName.trim())  e.lastName  = 'required'
    if (!phone.trim())     e.phone     = 'required'
    if (!preferredDate)    e.preferredDate = 'required'
    if (!agreement)        e.agreement = 'agreementRequired'
    if (deliveryMethod === 'delivery') {
      if (!street.trim()) e.street = 'required'
      if (!city.trim())   e.city   = 'required'
      if (!zip.trim())    e.zip    = 'required'
      else if (!ZIP_RE.test(zip)) e.zip = 'zipInvalid'
    }
    return e
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    if (paymentMethod === 'bank_transfer' && !bankConfigured) {
      toast.error(t('errors.paymentMethodMissingBankDetails'))
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer: { firstName, lastName, phone },
          deliveryMethod,
          deliveryAddress: deliveryMethod === 'delivery' ? { street, city, zip } : undefined,
          preferredDate,
          customerNote: customerNote || undefined,
          paymentMethod,
          locale,
        }),
      })
      const json = await res.json() as { ok: boolean; orderNumber?: string; errors?: Array<{ productName: string; code: string; min?: number }>; reason?: string }
      if (!res.ok || !json.ok) {
        if (json.errors && json.errors.length > 0) {
          for (const err of json.errors) {
            toast.error(t(`errors.${err.code}` as never, { name: err.productName, min: err.min ?? 0 }))
          }
        } else if (json.reason === 'paymentMethodMissingBankDetails') {
          toast.error(t('errors.paymentMethodMissingBankDetails'))
        } else {
          toast.error(t('errors.generic'))
        }
        return
      }
      router.push(`/pokladna/dekujeme/${json.orderNumber}`)
    })
  }

  const err = (k: string) => errors[k] ? t(`errors.${errors[k]}` as never) : null

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">{tCart('summary.subtotal')}</h2>
        <ul className="space-y-2 text-sm">
          {(cart.items ?? []).map((it, idx) => {
            const p = it.product as Product
            const name = typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[locale]
            const price = (typeof p === 'object' ? p.price : 0) * it.quantity
            return (
              <li key={idx} className="flex justify-between">
                <span>{name} × {it.quantity}</span>
                <span>{formatCzk(price)}</span>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-between font-bold text-lg pt-3 mt-3 border-t border-gray-200">
          <span>{tCart('summary.total')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h2 className="text-lg font-semibold">{t('sections.customer')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.firstName')}</span>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            {err('firstName') && <span className="text-xs text-red-600">{err('firstName')}</span>}
          </label>
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.lastName')}</span>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            {err('lastName') && <span className="text-xs text-red-600">{err('lastName')}</span>}
          </label>
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.email')}</span>
            <input value={user.email} readOnly className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">{t('fields.phone')}</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            {err('phone') && <span className="text-xs text-red-600">{err('phone')}</span>}
          </label>
        </div>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h2 className="text-lg font-semibold">{t('sections.delivery')}</h2>
        <fieldset className="space-y-2">
          <label className="flex items-start gap-3">
            <input type="radio" name="dm" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} className="mt-1" />
            <span>
              <span className="font-medium block">{t('deliveryMethod.pickup')}</span>
              <span className="text-sm text-text-secondary">{t('deliveryMethod.pickupInfo')}</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="dm" checked={deliveryMethod === 'delivery'} onChange={() => setDeliveryMethod('delivery')} className="mt-1" />
            <span>
              <span className="font-medium block">{t('deliveryMethod.delivery')}</span>
              <span className="text-sm text-text-secondary">{t('deliveryMethod.deliveryFreeRegion')}</span>
            </span>
          </label>
        </fieldset>

        {deliveryMethod === 'pickup' && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <div><strong>{farm.address.street}</strong></div>
            <div>{farm.address.zip} {farm.address.city}</div>
            {farm.phone && <div>Tel.: {farm.phone}</div>}
            {farm.openingHours && <div className="whitespace-pre-line">{farm.openingHours}</div>}
          </div>
        )}

        {deliveryMethod === 'delivery' && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-sm mb-1">{t('fields.street')}</span>
              <input value={street} onChange={e => setStreet(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              {err('street') && <span className="text-xs text-red-600">{err('street')}</span>}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block">
                <span className="block text-sm mb-1">{t('fields.city')}</span>
                <input value={city} onChange={e => setCity(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                {err('city') && <span className="text-xs text-red-600">{err('city')}</span>}
              </label>
              <label className="block">
                <span className="block text-sm mb-1">{t('fields.zip')}</span>
                <input value={zip} onChange={e => setZip(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                {err('zip') && <span className="text-xs text-red-600">{err('zip')}</span>}
              </label>
            </div>
          </div>
        )}

        <label className="block">
          <span className="block text-sm mb-1">{t('fields.preferredDate')}</span>
          <input type="date" min={today} value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          {err('preferredDate') && <span className="text-xs text-red-600">{err('preferredDate')}</span>}
        </label>

        <label className="block">
          <span className="block text-sm mb-1">{t('fields.customerNote')}</span>
          <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
      </section>

      <section className="bg-white rounded-lg p-6 border border-gray-200 space-y-3">
        <h2 className="text-lg font-semibold">{t('sections.payment')}</h2>
        <fieldset className="space-y-2">
          <label className="flex items-start gap-3">
            <input type="radio" name="pm" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} className="mt-1" />
            <span className="font-medium">{t('paymentMethod.bankTransfer')}</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="pm" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} className="mt-1" />
            <span className="font-medium">{t('paymentMethod.cashOnDelivery')}</span>
          </label>
        </fieldset>
      </section>

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={agreement} onChange={e => setAgreement(e.target.checked)} className="mt-1" />
        <span className="text-sm" dangerouslySetInnerHTML={{ __html: t.raw('fields.agreement') as string }} />
      </label>
      {err('agreement') && <div className="text-xs text-red-600 -mt-3">{err('agreement')}</div>}

      <button type="submit" disabled={submitting} className="w-full bg-brand text-white py-4 rounded-lg font-bold text-lg disabled:opacity-60">
        {submitting ? '…' : t('submit')}
      </button>

      <Link href="/kosik" className="block text-center text-sm text-text-secondary underline">
        {tCart('cta.continueShopping')}
      </Link>
    </form>
  )
}
```

The `dangerouslySetInnerHTML` on the agreement label is acceptable because the content is from our own `messages` files; if you'd prefer a hardened approach, swap to next-intl's `rich` formatter with `<Link>` callbacks.

- [ ] **Step 2: Suggested commit**

```bash
git add src/app/\(frontend\)/\[locale\]/pokladna/page.tsx src/components/checkout/CheckoutForm.tsx
git commit -m "feat(checkout): /pokladna page + form"
```

---

## Task 26: Thank-you page + QrInline

**Files:**
- Create: `src/app/(frontend)/[locale]/pokladna/dekujeme/[orderNumber]/page.tsx`
- Create: `src/components/checkout/ThankYouContent.tsx`
- Create: `src/components/checkout/QrInline.tsx`

- [ ] **Step 1: Write the thank-you page**

```tsx
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { redirect } from '@/lib/i18n/routing'
import { ThankYouContent } from '@/components/checkout/ThankYouContent'
import type { SiteSetting } from '@/payload-types'

type Props = { params: Promise<{ locale: 'cs' | 'en'; orderNumber: string }> }

export default async function ThankYouPage({ params }: Props) {
  const { locale, orderNumber } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect({ href: '/prihlaseni', locale })

  const found = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 1,
  })
  const order = found.docs[0]
  if (!order) notFound()

  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSetting

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <ThankYouContent order={order} settings={settings} locale={locale} />
    </div>
  )
}
```

- [ ] **Step 2: Write ThankYouContent**

`src/components/checkout/ThankYouContent.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/routing'
import type { Order, SiteSetting } from '@/payload-types'
import { QrInline } from './QrInline'

type Props = { order: Order; settings: SiteSetting; locale: 'cs' | 'en' }

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function fmtCzAccount(p: SiteSetting): string {
  const pay = p.payment
  if (!pay?.accountNumber || !pay?.bankCode) return ''
  const left = pay.accountPrefix ? `${pay.accountPrefix.replace(/\D/g, '')}-` : ''
  return `${left}${pay.accountNumber.replace(/\D/g, '')}/${pay.bankCode.replace(/\D/g, '')}`
}

export async function ThankYouContent({ order, settings, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'checkout.thankYou' })
  const orderNumber = String(order.orderNumber)
  const isBank = order.paymentMethod === 'bank_transfer'

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-brand">{t('title')}</h1>
        <p className="text-text-secondary">{t('body', { orderNumber })}</p>
      </div>

      <section className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">{t('paymentTitle')}</h2>
        {isBank && order.qrSpayd ? (
          <div className="space-y-4">
            <p className="text-sm">{t('paymentBankTransfer')}</p>
            <div className="flex justify-center">
              <QrInline spayd={order.qrSpayd} alt={t('qrAlt')} />
            </div>
            <p className="text-sm text-text-secondary">{t('manualFallback')}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-text-secondary">{t('accountLabel')}</dt>
              <dd className="font-semibold">{fmtCzAccount(settings)}</dd>
              <dt className="text-text-secondary">{t('bankLabel')}</dt>
              <dd className="font-semibold">{settings.payment?.bankName ?? ''}</dd>
              <dt className="text-text-secondary">{t('amountLabel')}</dt>
              <dd className="font-semibold">{formatCzk(order.totalAmount)}</dd>
              <dt className="text-text-secondary">{t('vsLabel')}</dt>
              <dd className="font-semibold">{orderNumber}</dd>
            </dl>
          </div>
        ) : (
          <p className="text-sm">{t('paymentCashOnDelivery')}</p>
        )}
      </section>

      <Link href="/produkty" className="block text-center bg-brand text-white py-3 rounded-lg font-semibold">
        Pokračovat v nákupu
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Write QrInline**

`src/components/checkout/QrInline.tsx`:

```tsx
import { renderQrDataUrl } from '@/lib/payment/qr'
import Image from 'next/image'

type Props = { spayd: string; alt: string }

export async function QrInline({ spayd, alt }: Props) {
  const dataUrl = await renderQrDataUrl(spayd)
  // next/image needs explicit dimensions; data URLs work directly
  return <Image src={dataUrl} alt={alt} width={280} height={280} className="border border-gray-200 rounded-lg" unoptimized />
}
```

- [ ] **Step 4: Suggested commit**

```bash
git add src/app/\(frontend\)/\[locale\]/pokladna/dekujeme/ src/components/checkout/ThankYouContent.tsx src/components/checkout/QrInline.tsx
git commit -m "feat(checkout): thank-you page with in-app QR re-render"
```

---

## Task 27: Build + typecheck

**Files:** (none modified — verification only)

- [ ] **Step 1: Full build**

```bash
npm run build
```
Expected: completes without errors. Common gotchas:
- Imports referencing `@/payload-types` need types regenerated — run `npm run generate:types` if anything's off.
- `Cart`, `Order`, `SiteSetting` interface names might differ slightly; align imports.
- React-19 + Server Components don't like `'use client'` files importing server-only things — if `getOrCreateCart` is imported into a client component, refactor to receive cart data as props.

- [ ] **Step 2: Importmap regen (no-op expected)**

```bash
npm run generate:importmap
```
Expected: no diff. If diffs exist, commit them — they're required for Vercel admin to boot (per CLAUDE.md).

- [ ] **Step 3: Suggested commit (only if importmap regen produced changes)**

```bash
git add src/app/\(payload\)/admin/importMap.js
git commit -m "chore: regenerate admin importMap"
```

---

## Task 28: Manual end-to-end verification

**Files:** (none — manual)

This task mirrors spec §13. Walk through all of it before opening the PR. The user runs this on their local machine before deciding to ship.

- [ ] **Step 1: Cart lifecycle (spec §13.2)**
  1. Logged-in customer, add 2× of one product → toast appears, header badge shows `2`, `/kosik` lists the line at qty 2.
  2. Change quantity in `/kosik` to 5 → updates, total recalculates.
  3. Remove item → cart empties to "Košík je prázdný" + CTA to `/produkty`.
  4. Add a product where `minimumOrder = 3` → quantity stepper enforces ≥ 3.
  5. Add product, log out, log back in (same user) → cart still there.
  6. Add on `/cs`, view on `/en/cart` → same cart, locale labels.

- [ ] **Step 2: Checkout & order placement (spec §13.3)**
  7. Empty cart → `/cs/pokladna` redirects to `/kosik`.
  8. Non-empty cart → form renders, pre-filled phone, delivery address pre-fills when toggling Doručení.
  9. Submit with missing required field → inline error.
  10. Submit with `Bankovní převod` but SiteSettings.payment incomplete → toast error, no order created.
  11. Submit valid order → redirected to `/cs/pokladna/dekujeme/<orderNumber>`; cart empty; order visible in `/admin`.
  12. Confirmation email arrives. QR scans correctly in a real banking app (FIO test) — shows expected amount + VS = orderNumber.
  13. Staff notification arrives at `SiteSettings.notificationEmail` with working admin link.
  14. Place a second order same year → orderNumber increments by 1.

- [ ] **Step 3: Access control (spec §13.4)**
  15. Customer A places an order. Customer B (logged in) `GET /api/orders/<A_order_id>` → 403.
  16. Customer A `PATCH /api/orders/<self_order>` with `paymentStatus: 'paid'` → status unchanged on re-read.
  17. Customer A `DELETE /api/carts/<B_cart_id>` → 403.
  18. Anonymous `GET /api/carts/<any>` → 403.

- [ ] **Step 4: Staff /admin (spec §13.5)**
  19. Create a staff user via admin panel → user sets password → logs in to `/admin/login`.
  20. Staff sidebar shows only Orders + Carts.
  21. Staff flips paymentStatus to `paid` → customer receives "Platba přijata" email.
  22. Staff flips orderStatus to `shipped` → customer receives the right "ready/on the way" email per delivery method.
  23. Staff cannot change totalAmount (field is admin-only).
  24. Staff cannot delete orders.

- [ ] **Step 5: Emails (spec §13.6)**
  25. Place 4 orders (pickup+bank, pickup+cash, delivery+bank, delivery+cash). Verify each customer email has the right content blocks. QR appears only on the two `bank_transfer` ones.
  26. Place an order on `/en/checkout` → email is English; staff notification still Czech.
  27. Reply to a customer email → lands at `SiteSettings.contact.email`.
  28. Save an order in /admin twice in a row with `paymentStatus: paid` → only one "payment received" email fires.

- [ ] **Step 6: UI quality (spec §13.7)**
  29. iPhone-sized viewport: `/kosik`, `/pokladna`, thank-you all single-column, no horizontal scroll.
  30. Forms keyboard-navigable; visible focus rings.
  31. Email rendered in Gmail web + iPhone Mail: brand colors correct, QR sharp.

- [ ] **Step 7: When everything checks out**

This is the point where the user takes over: open a feature branch (if not already), push, and create the PR. The plan stops here — the user handles git per their workflow.

---

## Self-Review Notes (from plan author)

Mapping spec sections → tasks:

| Spec section | Task(s) |
|---|---|
| §3.1 Carts collection | 5, 8 |
| §3.1.1 enforceOneCartPerUser hook | 5 |
| §3.2 Orders changes | 6, 8 |
| §3.2.1 Order read access | 6 |
| §3.2.2 Field-level access | 6 |
| §3.3 staff role | 4, 8 |
| §3.3.1 Admin nav visibility | 3, 4, 7 |
| §3.4 SiteSettings payment + notificationEmail | 3, 8 |
| §4 Routes added | 2, 20, 24, 26 |
| §5 Cart UX | 20, 21, 22, 23 |
| §6.1 Checkout form | 24, 25 |
| §6.2 Stock validation | 17, 18 |
| §6.3 Submit transaction | 17, 18 |
| §7 QR Platba (IBAN, SPAYD, PNG) | 10, 11, 12 |
| §8.1 Customer order confirmation | 15, 17 |
| §8.2 Staff notification | 16, 17 |
| §8.3 Payment received | 16, 19 |
| §8.4 Order shipped | 16, 19 |
| §8.5 Email infrastructure (reply_to, locale) | 14, 17, 19 |
| §9 Staff role + /admin access | 4, 7 |
| §10 i18n strings | 1, 2 |
| §11 Access control summary | covered by 4, 5, 6, 7 |
| §12 Env vars | (no change — none new) |
| §13 Verification plan | 28 |
| §14 Dependencies | 12 |
| §15 Deliverables | full plan |

No placeholders; every code step shows the actual code. Type/method names match between tasks: `getOrCreateCart`, `deriveCzIban`, `buildSpayd`, `renderQrPng`/`renderQrDataUrl`, `generateOrderNumber`, `placeOrder`, `placeOrderEndpoint`, `sendStatusEmails`, `orderConfirmationTemplate`/`Subject`, `staffNotificationTemplate`/`Subject`, `paymentReceivedTemplate`/`Subject`, `orderShippedTemplate`/`Subject`.

Known risks called out:
- Order-number generation has a benign race at high concurrency — explicitly out of scope.
- `payload.sendEmail` typing for `attachments`/`replyTo` may need a cast; documented in Task 17 step 1.
- Field-level access on `paymentStatus`/`orderStatus` should accept staff updates AND admin updates — verified in Task 6 with `adminOrStaff` helper.
- Resend domain verification for `kurniksopa.cz` is still pending from Phase 3a — will affect prod email delivery, not the plan itself.
