# Max Volume Nutrition — Production cutover status (2026-11-06)

## Verified infrastructure
- Existing Render service: `srv-dbk8a33bc2fs73enbmf0`, workspace `tea-dbjqt8nlk1mc73a26c10`; no second web service created.
- Plan: Starter (`0.5c-512mb`), Singapore; existing GitHub `VMahendar/Max-Volume-Nutrition-` on `main`.
- Render disk: `dsk-dbmtm53ncjis73agbtng`, actual Render disk name `disk`, 1 GB at `/var/data`.
- Public staging URL: `https://max-volume-nutrition-preview.onrender.com`.
- Existing startup remains `npm run start:staging`, NOT production. Staging publicly browsable but has noindex/noarchive headers.
- On 2026-11-06 the staging `DATA_DIR` was changed to `/var/data/mvn-staging` to test persistent disk behavior. **This directory contains staging-only demo accounts/orders/stock and MUST NEVER be used as production data or migrated into a production database.**
- Merchant switches deliberately remain `PAYMENTS_ENABLED=false`, `SHIPROCKET_ENABLED=false`, `LIVE_PAYMENTS_APPROVED=false`.
- Production database location reserved for a future **separate clean initialization**: `/var/data/mvn-production`. Do not set it for the staging entry point.
- A disk-backed staging directory does NOT mean that a real-account database and disaster recovery are production-ready.

## Production gates (all required before real order processing)
1. Automatic encrypted offsite SQLite backups with independent restore rehearsal; disk alone is insufficient.
2. Dedicated clean production DB bootstrap, administrator account with strong credentials and MFA, secure account email verification and password reset; no staging demo users.
3. Verified owner-managed physical stock for each product and 8 retail variants, pack-specific current front/back/ingredient photos, correct flavours/pack types.
4. Legal business name, current registered GSTIN, real physical address, contact email, tax classifications, inclusive retail prices, invoice/legal/privacy/refund/returns/delivery policies confirmed by owner and accountant.
5. Razorpay live merchant approval, secrets stored only in Render, webhook registration and tested captured payment/refund/cancellation/duplicate callbacks, stock reconciliation and operator refund procedures.
6. Delivery service regions, shipping fees, courier/pickup and tracking/return logistics; Shiprocket credentials and end-to-end checks if enabled.
7. Owned custom domain, verified TLS and matching PUBLIC_ORIGIN; remove staging X-Robots-Tag only during safe production cutover; add and validate sitemap, robots, canonical metadata, Google Search Console.
8. E2E mobile and desktop customer/dealer/admin security, stock, payment and fulfilment tests.
9. Run `npm run launch:audit -- --report` for exact application readiness; production `npm run start:production` intentionally fails closed if any required gate is false.
10. Verify database persistence over restarted deployments and demonstrate restored backup before opening checkout.

## Change protection
- Do not turn on real payments, enable shipping, create a second Render service, or replace the running staging start command as a shortcut.
- Keep `PUBLIC_ORIGIN` production configuration off the staging service until verified domain cutover.
- The live site may continue safe catalogue/WhatsApp browsing until production gates pass.
