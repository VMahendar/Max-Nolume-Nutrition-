# Max Volume Nutrition store

Responsive retail storefront and server-side Razorpay integration, built from the existing catalogue. Online payment is intentionally off until the owner supplies prices, stock, delivery charges, business details and provider credentials. No credentials or invented retail prices are included.

## Run

Node 24 or later. No third-party runtime packages are required.

```
cp .env.example .env
npm start
```

Open http://localhost:3000. Use `npm run check` and `npm test` before release.

## Structure

- `public/`: homepage, product detail hash routes, accessible shopping bag, delivery form, payment status screen and policy drafts.
- `data/products.json`: authoritative variant prices in paise and stock quantities. Null means unconfirmed, never zero-price checkout.
- `data/store.json`: shipping charge in paise, delivery region and business contact details.
- `server.mjs`: checkout orders, SQLite order storage, signature verification and captured-payment checks.
- `runtime/orders.sqlite`: private order database; excluded from Git and static hosting.

Static GitHub Pages can show the storefront and cart but cannot execute the payment backend. Serve the complete project with Node on an HTTPS host with a persistent disk for real checkout. Never upload the project root or runtime folder as a public static directory. The workflow uploads `public/` only.

## Owner activation requirements

1. Supply the approved retail price, precise size/flavour and available stock for every SKU. Prices must be final customer amounts, including any applicable tax. Update `data/products.json`, then synchronise its public copy: `cp data/products.json public/catalog.json`.
2. Confirm shipping fee and service area, full business address, support email and final policy terms. Update `data/store.json`, sync to `public/store.json`, remove policy draft notices only after approval.
3. Confirm the final MV grid logo. A historical saved emblem is included for reference but the interface currently uses a clean wordmark to avoid substituting an incorrect logo.
4. The actual 5 kg Nitro Mass bucket photo is included. Manufacturer reference URLs are used for whey, creatine and pre-workout with designed fallbacks. Replace them with approved local pack images; confirm 3 kg and multivitamin photography.
5. Set Razorpay test key ID and secret in the server environment, plus webhook secret. Do not paste secrets into source, chat, public files or GitHub. Configure `PUBLIC_ORIGIN` to the exact HTTPS origin.
6. Configure Razorpay webhook events `payment.captured` and `order.paid` to `https://YOUR_DOMAIN/api/webhook`, using the configured webhook secret. Enable automatic capture in the provider account.
7. After approving business details and policy text, set `POLICIES_APPROVED=true` and `PAYMENTS_ENABLED=true`. These flags are server-only. Complete a test payment, cancellation, failure and webhook test before replacing test keys with live keys.
8. Checkout reserves inventory atomically in SQLite. Paid and pending orders consume stock. Abandoned orders and uncertain provider failures intentionally keep their reservations until an operator reconciles the provider status; automatic reservation expiry and a fulfilment dashboard are not implemented. Keep a single persistent database and reconcile pending orders before restocking. Live provider tests and operational setup are still required.

Orders are stored privately in SQLite. Back up the persistent volume. View recent orders locally with `node orders.mjs`; do not publish customer exports. No customer order email or courier integration is configured.

## Verification

Tests cover corrupt/stale cart data, quantity validation, server-calculated amounts, unpriced and unavailable products, incomplete delivery configuration, signature tampering and invalid delivery details. Mocked integration tests cover order creation, provider verification and duplicate webhooks. Live provider tests require the owner's payment account.

Razorpay integration reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
