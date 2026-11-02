# Free preview — owner requires zero payment

The owner has cancelled the paid hosting proposal. Do not create a paid service, attach a disk, upgrade a workspace, add a card, or activate payment/shipping integrations. The original gold logo and existing PR #1 code remain unchanged.

## Exact proposed service

- Existing confirmed Render workspace: Max Volume Nutrition.
- Existing GitHub repository: VMahendar/Max-Volume-Nutrition-.
- Branch: codex/complete-store-review (do not merge main).
- Service type: Node web service, compute plan `free` only.
- One instance; no disk, Postgres, Redis, worker, paid domain or paid add-ons.
- Auto-deploy: no.
- Build: `npm run check && env NODE_ENV=test STAGING_MODE=false npm test`.
- Start: `npm run start:staging`.
- `NODE_ENV=production`, `NODE_VERSION=24.19.0`, `HOST=0.0.0.0`, `STAGING_MODE=true`.
- `DATA_DIR=/tmp/mvn-free-preview` (temporary SQLite/test data).
- Set separate strong site-access, test-admin and test-customer passwords through private hosting settings. Store only the site-access password hash in `STAGING_PASSWORD_HASH`.
- `PUBLIC_ORIGIN` is derived by the staging entry point from Render's actual `RENDER_EXTERNAL_URL`; do not invent a preview hostname.
- Keep `PAYMENTS_ENABLED`, `RAZORPAY_TESTED`, `LIVE_PAYMENTS_APPROVED`, `POLICIES_APPROVED`, `SHIPROCKET_ENABLED` and `SHIPROCKET_TESTED` false. Do not configure Razorpay/Shiprocket credentials.

The staging entry point forces payment and shipping integrations off. GST invoicing is disabled in the test dataset. A bank account and GST registration are not required to inspect the preview. Checkout remains disabled; browsing and cart preparation work.

## Required zero-payment verification before service creation

Render documents that Free services consume workspace bandwidth/build allowances and can incur usage charges if a payment method is attached. The current connection does not expose workspace billing plan, card status or spend controls. The workspace's `team` type does not prove its billing plan.

Before provisioning, confirm the workspace is Hobby with no payment method attached (or verify an equivalent provider-enforced zero-spend configuration). If that cannot be confirmed, do not claim guaranteed-zero hosting or create resources under the zero-payment instruction. Do not remove cards or change existing billing settings without explicit authorization.

## Limitations accepted for a preview

Free services can sleep after inactivity; the first page load can take about one minute. The filesystem is ephemeral: registrations, sessions, stock edits, orders and dealer approvals can reset when the service restarts, redeploys or sleeps. The test initializer recreates the synthetic dataset when the directory is empty. There are no real customer or payment records.

## Required verification after deployment

Wait for the deployment to become live. Confirm the returned HTTPS URL works and prompts for the staging password; anonymous HTML/images/API requests must not reveal the website. Confirm the exact gold PNG is served, test account login/admin access works, cart works, and payment/shipping readiness are both false. Supply the actual verified URL to the owner. Do not report a URL before it exists.

Official references: https://render.com/docs/free and https://render.com/docs/outbound-bandwidth.
