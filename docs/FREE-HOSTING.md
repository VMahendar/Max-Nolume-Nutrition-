# No-monthly-hosting-cost option

The owner clarified that “zero payment” means **free hosting/services while accepting online customer payments**. This changes the hosting decision: the proposed zero-monthly path is Cloudflare Workers Free + D1 Free, serving the existing HTML/CSS/JS and a same-origin checkout API on a free HTTPS `workers.dev` address. The existing GitHub Pages marketing site can stay online. A custom domain is optional and may cost money. Do not enable paid Cloudflare plans or add-ons.

This is a free-tier architecture, not unlimited hosting and not fee-free payment processing. Razorpay transaction charges/taxes depend on the merchant agreement. Actual shipping, refunds, chargebacks, a paid domain, optional email or other services may also cost money. None are purchased or activated by this code.

## Verified limits and sources

Checked against Cloudflare's current public documentation on 2026-11-02:

- Workers Free: 100,000 dynamic requests/day; 10 milliseconds CPU per invocation. Static asset requests are free/unlimited under the documented asset model. [`workers/platform/pricing`](https://developers.cloudflare.com/workers/platform/pricing/).
- D1 Free: 5 million rows read/day, 100,000 rows written/day, 5 GB total storage, 10 databases subject to per-database platform limits. [`d1/platform/pricing`](https://developers.cloudflare.com/d1/platform/pricing/).
- Free plans can stop serving dynamic requests when limits are reached. Do not upgrade automatically to solve a quota error. Review usage and database size in the dashboard; test CPU consumption on the actual free account before enabling payments. Failed service/quota calls must not be interpreted as payment success.

Docs were read from the official Cloudflare GitHub repository. Razorpay order and signature behavior was checked against its official Node SDK source (`razorpay/razorpay-node`, `lib/resources/orders.js` and `lib/utils/razorpay-utils.js`). No live provider access is claimed.

## What this path implements

- Existing navy storefront and WhatsApp quote bag, with an optional bridge to authoritative D1 public retail data. No private pricing is exposed through the product API.
- Responsive guest retail cart/checkout, quantity editing, verified delivery rules, server-calculated INR paise amounts and inclusive GST split. Prices, tax and shipping never come from client totals.
- Persistent D1 orders/items, atomic stock reservation/rollback using SQL triggers, idempotency and guest order access tokens. Tokens are random and only their hashes are stored server-side. The guest access token stays in the browser tab; it is not a password or customer account.
- Server-created Razorpay orders; client callback HMAC and raw-body webhook HMAC verification; fetched provider captured status/amount/currency/order verification before marking paid. Captured callbacks and repeated webhooks share one durable payment record.
- Provider timeouts stay unresolved for reconciliation rather than creating another payment. Cancellation restores stock once. A captured payment arriving after cancellation enters `paid_review`, which cannot be fulfilled automatically.
- Admin UI at `/admin`, guarded by a deployment secret retained only in page memory. Product/stock/price/review editing uses optimistic stock checks. Verified shipping-rule editor, recent orders, delivery details, provider-order reconciliation and paid-only fulfillment are supplied. Admin does not have a “pretend paid” button.
- Same-origin mutation checks, prepared statements, bounded JSON bodies, throttling, server-verified Cloudflare Turnstile bot protection required for live payments, non-public API responses and a daily expired-rate-limit cleanup job.

All eight products start with **zero stock and no verified HSN/tax**. Shipping rules start empty. Checkout and legal/live flags default false. Missing credentials never become simulated payment success.

## Choose one authoritative backend

**For the free-hosting path, D1 is authoritative. Do not run a separate WooCommerce checkout at the same time.** The earlier WordPress plugin remains a reference alternative, not a second active order system. There is no two-way order/inventory synchronization. If later choosing Woo, explicitly migrate data and retire the Worker checkout before reopening orders.

This Worker path currently supplies **guest retail checkout**. It does not inherit the WordPress plugin's customer accounts, approved dealer price workflows or reports. Customer login/saved addresses, recorded B2B quotations/approvals, coupons, invoice/credit-note generation, automatic refunds, Shiprocket, batch/expiry tracking and transactional emails are still development/integration gaps. WhatsApp wholesale enquiries remain working. Do not present the full Issue #2 as complete.

## Local run — no account or payment credentials required

Node 24+, then:

```sh
npm ci
npm run check
npm run worker:migrate:local
npm run worker:dev
```

Open the local address printed by Wrangler. The catalogue comes from local D1, checkout is disabled and all stock is unverified. `npm run worker:bundle` performs a **dry run only**, not a deployment. The database ID of all zeroes in `wrangler.jsonc` is a local placeholder; replace it only with a D1 ID from the owner's actual free Cloudflare account.

For local secret testing, copy `.dev.vars.example` to `.dev.vars` and fill through a secure local workflow. Never commit `.dev.vars`, put secrets in public HTML, or paste secrets into chat/issues. Test fixtures use fake keys and mocked provider responses; those are not real payment tests.

## Account setup and staging activation

1. Create/choose the owner's **Cloudflare Free** account. Use a free `workers.dev` subdomain; confirm Workers is on the Free plan and no paid add-ons or upgrades are enabled. No Cloudflare account/token is connected in this session.
2. With approved authenticated Wrangler access, create the D1 database: `npx wrangler d1 create max-volume-nutrition`. Put its returned ID in `wrangler.jsonc`. Apply migrations with `npx wrangler d1 migrations apply max-volume-nutrition --remote` only to the explicitly approved staging database. Use a separate D1 database/Worker deployment and keys for production; never mix test and live orders.
3. Create/approve a Razorpay merchant account and complete required KYC/bank onboarding. Supply **test** key ID, key secret and a distinct webhook secret via Cloudflare secret management. Use `npx wrangler secret put RAZORPAY_KEY_ID` (and the corresponding names for the other secrets). Create `ADMIN_TOKEN` as a cryptographically random secret of at least 32 characters; store it in a password manager. Rotate it if exposed.
4. After explicit staging deployment approval, run `npm run build` and `npx wrangler deploy`. This publishes the preserved website and API together at the returned HTTPS address. No such deployment was performed by the implementation work.
5. Configure Razorpay's test-mode webhook to `https://<approved-worker-host>/api/webhooks/razorpay`, subscribe to `payment.captured`, and use the configured webhook secret. The server separately fetches and validates the captured payment. Register the approved site with Razorpay and confirm browser checkout domain eligibility.
6. In `/admin`, enter actual available stock, approved product/pack images, verified HSN/GST rate and price interpretation; mark reviewed only after checking labels and inventory. Enter actual serviceable pincodes, matching state codes and approved tax-inclusive shipping tariffs. No fictional shipping quotes or ETA are supplied. Approval here is an owner's operational action; database seed data is unverified.
7. Obtain legal/business/tax review and replace the policy drafts, including disclosures for Cloudflare/Razorpay processing. Configure independent backups/exports, monitoring, WAF/bot protection, secret rotation and restore testing. Disable public indexing for staging via approved host access rules. Create a free Cloudflare Turnstile widget for the approved hostname, set public `TURNSTILE_SITE_KEY` in Worker vars and secret `TURNSTILE_SECRET` through secret management. Live checkout requires both; the server checks challenge success, action and hostname. Test allowed/failed/expired/replayed challenges in staging.
8. In staging only, enable `CHECKOUT_ENABLED=true` and `LEGAL_APPROVED=true` with `PAYMENT_MODE=test`, retaining `LIVE_PAYMENTS_APPROVED=false`. Run the entire real provider acceptance matrix, including out-of-order events, retries, amount mismatch, late captures and refunds, using official test instruments.
9. **Live activation remains blocked pending explicit owner approval.** Live keys additionally require `PAYMENT_MODE=live` and `LIVE_PAYMENTS_APPROVED=true`. Do not flip those flags merely to complete setup. Real payment, shipping and invoice acceptance tests remain outstanding.

## Operations and recovery

- An order in `creating` may already exist at Razorpay despite a timeout. Search its receipt (the store order UUID) in the provider dashboard, then use the admin reconciliation form to link the existing provider ID. Use the admin payment verification form with its payment ID to recheck captured status through Razorpay when a customer callback/webhook was lost. The server verifies receipt/amount/currency. Never blindly create another provider order. A cancelled unresolved order can also be linked so late capture is recorded safely.
- Pending/creating reservations do not auto-expire: provider payment creation/capture cannot be assumed absent after a timeout. Use the guest cancel action where available, or reconcile with provider records before an administrator-supported cancellation/stock correction. Preserve audit evidence; do not edit stock blindly to resolve a payment dispute.
- `paid_review` requires manual stock allocation or a verified provider refund. Process refunds through Razorpay's authorized dashboard until an automated integration is implemented. This code does not issue refunds, accounting invoices or credit notes.
- Guest access lives in sessionStorage for the tab; losing it requires contacting the business with the order reference. A public order UUID alone cannot read order details. Customer accounts/email recovery are not implemented for this path.
- Production D1 export/restore and paid-order reconciliation need an owner-run, tested backup plan. The daily cron only removes expired throttle rows; it does not delete orders or customer data. Configure approved retention before launch.
