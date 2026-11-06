# MAX VOLUME NUTRITION — Paid Production Upgrade Review (6 November 2026)

STATUS: PROPOSAL ONLY. NO PAID UPGRADE, DOMAIN PURCHASE, LIVE PAYMENT ACTIVATION OR PRODUCTION CUTOVER AUTHORIZED.

## Existing infrastructure (verified through Render)
- Workspace: Max Volume Nutrition (`tea-dbjqt8nlk1mc73a26c10`)
- Service: `max-volume-nutrition-preview` (`srv-dbk8a33bc2fs73enbmf0`)
- Repository: `https://github.com/VMahendar/Max-Volume-Nutrition-`, branch `main`
- Region: Singapore
- Current plan: Free; auto-deploy off
- Build command: `npm run check && env NODE_ENV=test STAGING_MODE=false npm test`
- Start command: `npm run start:staging` (never accept real orders using this startup)
- Current URL: `https://max-volume-nutrition-preview.onrender.com`
- Database: staging-only temporary SQLite; no Render Postgres instance found.

## Cost comparison (provider published rates, review account checkout before approval)
- Hobby workspace: $0/month plus compute and usage.
- One paid Starter web service (0.5 CPU, 512 MB RAM): $7/month.
- Persistent disk for SQLite: $0.25 per GB/month.
- Proposed initial disk: 1 GB; total infrastructure base: $7.25/month.
- 5 GB disk option: $1.25/month for disk; infrastructure base $8.25/month.
- Not included: paid domain registration, offsite backup destination, extra bandwidth/build usage, applicable tax, merchant transaction fees, email/WhatsApp API charges, optional larger compute plan.
- Cost references: https://render.com/pricing ; https://render.com/docs/disks ; https://render.com/docs/compute-plans
- Billing confirmation and explicit owner approval required before any plan change or disk attachment.

## Proposed storage and rollback
1. Before upgrading, complete an isolated test with fake data; treat current preview data as disposable, and do not migrate staging demo orders/users.
2. Prefer preserving the existing public service until release readiness. If upgrading the same service, first ensure cutover safety and no accidental public payments, then switch to paid compute and attach a disk only after approval.
3. Disk name: `mvn-production-data`; mount path: `/var/data`; initial size: 1 GB (owner to approve).
4. Production `DATA_DIR=/var/data/mvn-production` (not the staging-only directory).
5. Use a single instance with SQLite; do not build/init DB in build or predeploy commands (disk mounts at runtime).
6. Initialize a new production database. Register owner and promote via `manage.mjs`; do not transfer synthetic staging stock or test accounts.
7. Implement automated encrypted OFFSITE backups from SQLite online backup and test restoring to an isolated host. Disk daily snapshots alone are not sufficient for business recovery.
8. Prove order/account/stock persistence over restart and deployment before accepting real shoppers.
9. Retain a rollback plan and never roll back to a stale database over live orders.

## Launch gates for app & account security
- Keep startup `npm run start:staging` and gateway/shipping disabled until prerequisites pass.
- Review current application support for registration/login, dealer approvals, private tiers, order history and admin access.
- Implement production-grade account verification, password recovery and admin MFA; run authorization and cross-account tests.
- Save verified actual physical stock, legal seller details, GSTIN, invoice series, service areas and policies in the production database.
- Verify exact packaging/flavours/labels, no retired black/gold whey artwork and no mismatch between Nitro Mass 5 kg bucket and 3 kg box.
- Validate user flows in desktop and mobile browsers; review original MVN logo sizing on actual devices.
- Protect secret credentials in Render environment only, never repository or shared screenshots.

## Payment and fulfilment (requires separate merchant approval)
- Razorpay: verified merchant and KYC; test keys and webhook signatures; sandbox success/failure/cancellation/duplicate webhook/stock reconciliation; then verified live keys, policies and explicit owner consent.
- Production webhook path in app: `/api/webhook`. Confirm correct HTTPS domain and provider settings.
- Complete refund, cancellation, abandoned order and reconciliation procedures before first live payment.
- Shipping: confirm whether to run manual delivery or enable Shiprocket. Real online checkout requires clear serviceability, delivery charges, address handling and fulfilment process.
- Do not silently change `PAYMENTS_ENABLED`, `PAYMENT_MODE`, `LIVE_PAYMENTS_APPROVED`, `SHIPROCKET_ENABLED` or other activation switches.
- Production launch gate: `npm run launch:audit -- --report`; `npm run start:production` refuses incomplete setup.

## Google search and domain
- Acquire an approved domain, point DNS to the existing service, verify TLS and use matching `PUBLIC_ORIGIN`.
- The staging access gate currently sends `X-Robots-Tag: noindex, nofollow`; changing `robots.txt` alone does not permit indexing. Only remove noindex when production site is safe.
- Add sitemap.xml, robots.txt, canonical URLs, title/meta descriptions, product structured data for verified offers, Search Console ownership and submit sitemap.
- Google indexing cannot be guaranteed or instant.

## Approval boundary
Do NOT perform any of the following until the owner approves the final provider-displayed cost and scope: upgrade paid Render compute, attach a disk, create a paid DB, buy a domain, alter live merchant flags, create genuine orders/charge customer payment, or switch running preview to production. This document is not purchase authorization.
