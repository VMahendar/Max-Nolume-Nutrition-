# Max Volume Nutrition — launch status and safe handover
Checked 5 November 2026.

## Single source
- Canonical source: `main` at https://github.com/VMahendar/Max-Volume-Nutrition-
- **Currently live preview:** https://max-volume-nutrition-preview.onrender.com/
- Render service: `srv-dbk8a33bc2fs73enbmf0`, branch `main`, manual deployments.
- Existing Render plan: **Free**, application start: `npm run start:staging`.
- Codex root static site, separate Wix site and older ChatGPT-hosted link are **not additional production sources**. Do not give customers alternate links before cutover.
- Current frontend respects the original Max Volume Nutrition PNG logo, has Unicorn Pro Series Tamil Nadu distribution messaging and a more-brands-coming section.

## Already implemented and tested
- User registration, session login/logout, password changes, private order history.
- Dealer application, administrator review, approved wholesale/gym tiers, private dealer catalogue.
- Eight variants and approved retail selling prices; **private rates never published in `public/catalog.json`**.
- Price tier configuration from user-approved 2026 sheet in `data/products.json`, with safe missing-tier fallback for databases seeded before this change. Admin overrides and explicit clearing win.
- Customer catalogue, search, variant selection, cart and WhatsApp enquiry mode.
- Existing Razorpay order+webhook/signature/reconciliation implementation and Shiprocket shipment/serviceability tracking implementation, **both intentionally disabled** on staging.
- Tests under `npm test`, including real Chromium account/dealer/admin approval, price privacy, restoration of an online SQLite backup, and launch gate. GitHub workflows must pass before every merge.
- Backend media mapping never uses Cranberry packaging for Blueberry and never substitutes Nitro Mass 5 kg bucket for 3 kg box.

## Actions requiring owner or provider access
| Blocking item | Owner-supplied input / acceptance |
|---|---|
| Permanent domain | Choose and own the domain; connect its DNS to Render and verify HTTPS. Do not reuse the unrelated gym domain. |
| Durable production database | Render Free has no persistent disk guarantees for SQLite orders. Provision a paid Render persistent disk or a supported durable database migration, then verify persistence across deployments. |
| Offsite backups | Configure an encrypted off-host destination, automate a schedule, perform a witnessed isolated restore, and save recovery procedures. The existing `deploy/backup.mjs` can create online SQLite snapshots but cannot, by itself, store them offsite. |
| Razorpay | Merchant KYC approval, **live** key ID/secret and webhook signing secret in Render encrypted environment; configure live webhook URL; complete test and live nonzero-charge, capture and refund/reconciliation verification before explicit activation. Never share secret values in tickets or git. |
| Shiprocket | Active merchant account, API credentials, verified pickup location, shipping service regions, delivery price and weight/dimension audit; test shipment, AWB, label, pickup, tracking and cancellation flows. |
| Seller / tax | Confirm legal business name, full physical business address, support email, current GSTIN, HSN/rates and invoice series with accountant; review privacy/terms/returns/shipping policies. |
| Verified stock | Input actual on-hand quantities per SKU in admin; do not fabricate stock. |
| Missing pack photos | Current Potency Whey Chocolate and Coffee 5 lb **new** packs, Nitro Mass 3 kg **box**, Blueberry Creatine 100 g and Musclevite Multivitamin. Provide authentic manufacturer/owner photos for front, back, ingredients and nutrition panel. Do not display old black/gold Whey packaging or a different pack size/flavour. |
| Account recovery | Production-grade email verification, recovery/password reset, credential delivery and admin MFA need an approved email service and verified user acceptance tests; do not claim them complete. |

## Exact commands
- Code safety: `npm run check && npm test`
- Visual browser QA (CI with Playwright): `node tests/visual-qa.mjs`
- Read-only status with explicit failing gates: `npm run launch:audit -- --report`
- Strict production startup gate: `npm run start:production` (**refuses to start if any gate fails**)
- Private database backup on the actual host: `node deploy/backup.mjs /private/offsite-staging/orders-YYYY-MM-DD.sqlite`
- Render staging start: `npm run start:staging` — preserves test data and **disables all real payments and shipping regardless of environment flags**.

## Safeguards
1. Never replace the current working staging deployment with a production entry point before all required checks pass.
2. Do not publish customer-facing online payments until full end-to-end payment testing, tax approval, data recovery and explicit owner activation.
3. Do not use unknown stock counts or manufacturer catalog images for a different pack or flavour.
4. Do not put wholesale/gym prices, business secrets or supplier purchase costs in the public JS or HTML.
5. Use one final custom domain only after DNS/TLS, production service, security and restore testing are verified.
