# Test evidence and acceptance matrix

## Free-tier Worker/D1 addition

- `node tests/worker.test.js`: 16 database-backed tests passed using Node SQLite with a D1-compatible adapter. Razorpay HTTP responses are mocked. Covers public metadata isolation, configuration/live gates, CSRF origin, idempotency, authoritative totals, guest ownership, admin denial, invalid address/quantity/stock/tax, atomic stock rollback after a race, HMAC verification, provider amount mismatch, webhook replay, cancellation/late capture, ambiguous timeouts, optimistic stock edits, cancellation during provider creation, malformed/oversized JSON and verified Turnstile challenges.
- Wrangler 4.156.1 applied both migrations to **local D1** and bundled the Worker via `--dry-run`, without deployment. The real local Worker returned eight public products with zero/unverified stock.
- `python3 tests/worker-browser.py`: desktop 1440px/mobile 390px pass against local Wrangler on port 8790: real catalogue bridge, disabled checkout, cart reload and responsive layout; a fixture only tests quoted total presentation/invalidation. Unconfigured real admin access was denied. No successful real payment was simulated in the browser.
- `npm run check` passes the original storefront and public build isolation checks plus the Worker suite. No real Razorpay/Cloudflare account activation, provider test-mode transaction, production deployment, shipping booking, email delivery or accounting invoice is claimed.


## Executed locally

2026-11-02, Node 24.19.0 and system Chromium via Python Playwright:

- `npm run check`: JS syntax check, Node tests and static/plugin package build passed.
- Artifact isolation test passed: only the five public files enter the Pages artifact; plugin/backend files stay separate.
- `node tests/storefront.test.js`: six named tests passed: issue prices, corrupted/untrusted storage, valid quote reload/quantity bounds, search/category/empty results, variant price/stock messaging, drawer/storage failure.
- `python3 tests/browser.py`: desktop 1440px and mobile 390px; browse, mass 5 kg price, quote add, localStorage reload, search/no matches, Escape, no horizontal overflow and no JS page errors. External image traffic intentionally blocked in browser tests.
- Existing three revakanya.com image URLs returned HTTP 200 via configured network. This confirms reachability only, not approval/authenticity.
- PHP syntax and pricing/access tests run using `@php-wasm/cli` 3.1.62 in ignored `work/php`, because native PHP is absent and system apt writes are denied. Native PHP runs the same scripts in CI. The final run passed 27 pricing/access contract assertions and syntax checks for all seven PHP plugin/template files. Contract tests use stubs, **not a live WordPress or WooCommerce database**.

Reproduce PHP tests with PHP 8.2+:

```sh
php tests/pricing.php
find commerce -name '*.php' -exec php -l {} \;
```

The checked-in tests cover public/approved tier prices, inherited product restrictions, unauthorized price denial, MOQ, invalid private price fallback, revocation, tier SQL query conditions, variation cache partitioning, public metadata stripping, denied Store API and signed-out application/quote denial. Build and `git diff --check` must also pass. CI lint failures fail the job.

## GitHub CI

Commerce checks passed on implementation commit `d1c6d7382c62d0eff542f353044276bed2c08ee0`: https://github.com/VMahendar/Max-Volume-Nutrition-/actions/runs/41448968656 . This includes native PHP lint/contract tests, Node checks/build and plugin artifact upload. It does not run a WordPress database or provider integration.

## Staging matrix — not yet executed

| Area | Required cases and expected evidence |
|---|---|
| Setup/catalogue | Run seed twice: exactly eight missing SKUs as drafts/zero stock, existing products unchanged; verify attributes, image pack sizes, accurate descriptions. Activate template and check product/account/cart/checkout/wholesale at desktop/mobile sizes with keyboard and screen reader. |
| Retail | Guest and registered browse/search/all filters/sort/pagination; product variations, cart update/remove/reload, addresses, valid/invalid/expired coupons, authoritative tax/shipping and order history/ownership. Client price tampering must have no effect. |
| Stock/quantity | MOQ before add, aggregated adds, update below MOQ, invalid/negative/fractional qty, concurrent last-unit checkout, insufficient stock and failed payment stock release. |
| Partners | Signed-out denial, pending applicant denial, approval and revocation in separate sessions, disabled users, invalid GSTIN/pincode/phone, nonce failure, role spoofing, replay/throttle, correct emails. |
| Price isolation | Retail/gym/dealer direct product, search, feeds, REST, cart, checkout/pay-for-order, invoice and cache responses. Costs must never reach customer HTML/APIs. The Store API must return 403; classic Woo pages must work. Test a CDN and page cache, logged-out after an approved session, variation hashes and parent restrictions. |
| Quotes | Single-product create, simultaneous duplicate submit, invalid item/tier/qty, history ownership, staff review/conversion; quote is non-payable and does not reserve stock. Verify fresh tier/price before payment and no duplicate Woo order database. |
| Razorpay | Test-mode success/decline/abandonment, invalid signature, amount/currency mismatch, provider outage/timeouts, webhook before/after callback, duplicate/out-of-order events, refunds/duplicate refunds. Never mark paid before verified evidence. |
| Shiprocket | Real pincode serviceability, origin/weight/dimensions, quote/charge, no courier, outage, shipment replay, tracking, delivery, cancellation, RTO and return. |
| GST | Approved HSN/rates, intra/inter-state addresses, seller/buyer GSTIN, sequential invoice under concurrency, PDF/export, refund credit notes and duplicate callback behavior. |
| Admin/reports | Product/stock/coupon changes, order/payment/refund/fulfillment actions, approval auditing, private cost access; reconcile real tier revenue and margin snapshots with Woo orders and partial/full refunds. Missing costs must be explicit. |
| Operations | Provider outages must fail visibly, SMTP delivery and alerting, HTTPS/secure cookies, brute-force and endpoint rate limits, backup restore, DNS rollback, canonical/sitemap/OG/schema validity and consent-managed analytics. |

Do not convert unexecuted rows into passing results. Attach redacted test order/event IDs and exact WordPress/Woo/provider/invoice plugin versions before launch approval.
