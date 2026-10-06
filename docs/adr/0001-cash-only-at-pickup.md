---
status: accepted
date: 2026-10-07
---

# Payment is cash at pickup; the site takes no money

The farm sells poultry by weight, so the final price of most orders is only known
when the bird is weighed at pickup, and the owner wants no online payment at all.
We decided that the storefront never collects money: no card payments, no deposits,
no bank transfer. Customers pay cash when they collect.

## Consequences

- The bank-transfer option, the SPAYD/QR code email and the thank-you page QR are
  hidden from the storefront. The code stays in the repo, unused, in case the farm
  wants a QR code at pickup later.
- The Stripe placeholders (`stripeProductID`, `stripePaymentIntentID`, the `stripe`
  enum value and the `STRIPE_*` env vars) are removed. Nothing ever used them.
- `paymentStatus` reduces to "unpaid" and "paid", set by Staff on the Roster at pickup.
- Anyone finding payment libraries in the repo should read this before "finishing"
  the integration.
