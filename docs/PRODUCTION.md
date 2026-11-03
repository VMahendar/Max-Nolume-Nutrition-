# Production preparation — not deployed

The committed configuration is a reviewable template. No hosting account, DNS, production credentials, gateway or courier activation has been configured.

## Host requirements

Use one Node 24 application instance with one local persistent SQLite volume behind HTTPS. Do not run multiple replicas or place SQLite on a shared network filesystem. `deploy/Dockerfile`, `deploy/compose.yaml` and `deploy/Caddyfile` define a non-root application, read-only root filesystem, private data volume, HTTP health check and TLS reverse proxy. They have not been built or deployed in this environment. The application port is private to the compose network. Compose enables `TRUST_PROXY` only for this protected reverse-proxy topology, using the last validated forwarded IP for rate limits. Keep it false on a directly accessible Node server; never trust forwarded headers from untrusted clients.

Set the approved `DOMAIN` for Caddy and matching HTTPS `PUBLIC_ORIGIN` for the app. Run compose commands with the project root `.env` explicitly supplied, for example `docker compose --env-file .env -f deploy/compose.yaml ...`. Store `.env` outside version control with mode 0600 and restricted operator access; production secret injection is preferred. The image build excludes environment files, Git metadata and runtime data. Add host monitoring, disk alerts, patching and encrypted off-host backups. Verify the actual host platform and image versions before launch.

Before upgrading an existing database, create an online backup and test restoration to an isolated data directory. `node deploy/backup.mjs /PRIVATE_BACKUP_PATH/orders.sqlite` uses SQLite's online backup API and restrictive file permissions. Copying a live WAL database file alone is unsafe. To restore, stop the application, restore a verified backup into a fresh private data directory with the application user's ownership, and validate it before switching traffic. Do not overwrite a live database or restore stale `-wal`/`-shm` files. Schedule backups through the host operator, not a public API.

## Bootstrap and business configuration

Register the owner account on the private staging host, promote with `manage.mjs promote-admin`, then sign in again. Keep administrator membership restricted. Enter actual stock, business address, support email, delivery fee/coverage and approved tier prices. Seed files do not overwrite the database after first import. Stock is physical on-hand quantity; available quantity subtracts unresolved reservations. Existing database upgrades retain legacy orders and deduct legacy paid stock once.

Register/log in at `account.html`; administrative access is at `admin.html`. Review real buyer flows, access boundaries and backup restore before public access. Email verification, email-based password reset and MFA are not implemented yet. Do not rely on email possession for guest-order ownership: importing a guest order requires its saved secret token and a matching account email.

## Razorpay — disabled by default

Use a separate test account/key pair first. Configure the webhook at `/api/webhook` for `payment.captured` and `order.paid` and automatic capture in the provider dashboard. Ensure the configured origin exactly matches the browser origin.

Activation requires `PAYMENTS_ENABLED=true`, `POLICIES_APPROVED=true`, `RAZORPAY_TESTED=true`, test-prefixed key ID, key secret, webhook secret and complete store setup. Set the TESTED flag only in a controlled staging exercise and document actual successful/failure/cancellation/webhook tests before production approval. Automated mocked tests do not establish account readiness.

Live mode additionally requires `PAYMENT_MODE=live`, a live-prefixed key and `LIVE_PAYMENTS_APPROVED=true`. The production process rejects live mode without explicit approval. **Do not set these live flags until the owner approves.** No flags are changed automatically by the dashboard or tests.

Reconcile uncertain orders using Razorpay receipt/amount/currency. A provider-created order may still be paid after a browser window closes, so pending reservations do not expire automatically. Unknown references are recovered through the dashboard, not unchecked manual stock release. Refund initiation, refund reconciliation, credit notes and safe abandoned-order closure still require further implementation/operator procedures; do not mark a paid order refunded manually or restock shipped goods automatically.

Official reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

## Shiprocket — disabled by default

Create a dedicated API user in Shiprocket, provide API email/password and the exact pickup location name via environment secrets. The adapter supports token authentication, prepaid custom-order creation, courier serviceability/rates, AWB assignment, pickup scheduling, label/manifest generation and tracking by shipment ID. It never creates a new commerce order or modifies stock in Shiprocket.

`SHIPROCKET_ENABLED` and `SHIPROCKET_TESTED` must both be true with valid credentials and pickup configuration. Keep them false until a controlled account-specific test is approved and completed. No automatic courier calls occur after payment; an administrator explicitly creates a shipment. Timeouts keep a `provider_review` shipment record and block duplicate creation. Reconcile it in the provider dashboard before any retry; there is no automatic uncertain-shipment recovery yet.

Enter accurate total packed weight in kg and dimensions in cm. Use the order dashboard to check courier serviceability/rates, select the courier ID for AWB assignment, schedule pickup, generate label/manifest and refresh tracking. Completed operations are recorded and cannot be submitted twice; uncertain operations require reconciliation in the Shiprocket dashboard. Store the tracking reference during the paid order's `processing -> shipped -> delivered` workflow. Refresh provider tracking in the administrator dashboard. Customer order history displays locally recorded fulfilment; provider polling does not automatically change it.

The storefront uses the configured delivery fee and selected service states. Courier serviceability is available to administrators; dynamic checkout shipping-rate quotation is outstanding. No claim of live shipping readiness is made.

Official API and setup references:
- https://apidocs.shiprocket.in/
- https://support.shiprocket.in/support/solutions/articles/43000337456-shiprocket-api-document-helpsheet

## GST and invoices

Have the accountant approve seller details, product classification/rates and invoice content. Configure supported state codes and service areas; the initial implementation maps Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana, Maharashtra, Delhi and Puducherry. Add and test other states before serving them.

Invoices preserve product, buyer, seller and tax snapshots. Same-state tax splits into CGST/SGST; interstate tax uses IGST. Tax applies to configured inclusive product and shipping totals. A historical invoice never changes when current prices or seller settings change. Review rounding and invoice numbering with the accountant. E-invoice IRN, e-way bills, credit notes and accounting exports are not implemented. GST remains disabled by default.
