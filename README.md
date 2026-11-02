# Max Volume Nutrition

Continues PR #1 (`codex/complete-store-review`) using the original retail storefront and a single Node.js 24 / SQLite commerce backend. No WooCommerce, second inventory store, live activation, or deployment is included.

## Local development

```
cp .env.example .env
npm start
npm run check
npm test
```

Open the configured `PUBLIC_ORIGIN`. Payments and shipping default to disabled. Real payment credentials are unnecessary for the automated suite: provider requests are intercepted by isolated subprocess fixtures.

## Accounts and administration

- `/account.html`: register, sign in/out, change password, view your orders and apply for gym/wholesale pricing.
- `/admin.html`: review dealer applications; manage products, prices, inventory, orders, delivery settings and GST; reconcile payments and create/track Shiprocket orders.
- `/invoice.html?order=ORDER_ID`: access-controlled GST invoice with browser print/save PDF.

The first administrator must register normally. A trusted operator then runs on the application host:

```
node --env-file-if-exists=.env manage.mjs promote-admin OWNER_EMAIL
```

This invalidates that account's existing sessions. Sign in again. There is no public administrator bootstrap endpoint or default password.

## One source of commerce data

`DATA_DIR/orders.sqlite` stores users, hashed sessions, dealer applications, product definitions, physical inventory, orders, invoices, shipment references and audit records. `data/*.json` is imported **once** when an existing or new database is first upgraded. Subsequent changes use the administrator dashboard, not edits to seed files. Existing orders are retained; legacy paid quantities are deducted once when importing physical stock. Take a backup before upgrading an existing database.

`public/catalog.json` and `public/store.json` are retail-only static browsing fallbacks, not order/inventory systems. Static GitHub Pages cannot provide accounts, checkout, administration or real payments. The Node host serves `/api/catalog` from SQLite; static fallback disables payment. Never publish the project root or private database.

Approved retail prices remain unchanged: whey ₹4,999; Nitro Mass 5 kg ₹3,499 and 3 kg ₹2,599; creatine ₹899; pre-workout ₹1,399; Musclevite ₹699. Business prices are unset until entered explicitly. Approval alone does not invent a discount; missing tier prices block checkout for that tier.

## Safety and operations

- Passwords use unique salted scrypt hashes. Session identifiers are random, hashed in storage, HttpOnly/SameSite cookies and Secure on HTTPS. Password change invalidates every session.
- Mutating browser requests require the exact `PUBLIC_ORIGIN`; administrator access and order ownership are enforced server-side. Payment webhooks use the raw-body HMAC signature.
- Server-calculated prices, quantity checks and SQLite transactions prevent overselling. Payment retries with the same browser request key reuse the same order.
- Definite provider rejection releases its hold. Unknown provider outcomes retain stock, preventing late captured payments from overselling. Never release reservations merely because the checkout window closed.
- In the order dashboard, recover an unknown provider order ID only after the API confirms its receipt, amount and currency; then reconcile captured payment. Unknown webhook orders request retries instead of silently acknowledging capture.
- Paid quantities are deducted exactly once. Existing order/tax/price snapshots are immutable through product settings. Inventory adjustments require a reason and reject stale edits.
- Enable GST only after seller details, product HSN/rates and invoice format are approved. Existing customer prices are **inclusive**; enabling GST extracts the tax without increasing their price. Invoices are issued once on captured payment, with Indian financial-year numbering. Browser print can save PDF; this is not GST e-invoice/IRN or e-way-bill integration.

See [implementation status](docs/IMPLEMENTATION.md), [production runbook](docs/PRODUCTION.md) and [media checklist](docs/MEDIA.md). Do not merge, deploy, or enable live payments without owner approval.

## Password-protected staging preparation

See [the exact staging plan](docs/STAGING.md). `npm run start:staging` seeds an isolated test database and starts the existing app behind a site-wide password gate. It requires host-provided staging secrets and forces payment/courier integrations off. A password-protected Free preview is now live at https://max-volume-nutrition-preview.onrender.com using temporary test data; no paid service or disk was created. See the Free-only plan for limitations.

The current owner requirement is **zero payment**. The paid-disk proposal is cancelled; use [the Free-only preview plan](docs/FREE_PREVIEW.md). Payment collection, delivery integrations and GST invoicing remain disabled for preview.
