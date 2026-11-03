# PR #1 implementation report

Work continues on `codex/complete-store-review` from `edf0e3710429bd189659945df5290e83defeca2b`. The existing storefront, cart, checkout and Razorpay verification flow are retained and extended. Main is not merged or deployed. Node.js/SQLite remains the only commerce backend.

## Completed code by stage

| Stage | Implemented | Remaining / activation conditions |
|---|---|---|
| Checkout, stock, payment and security fixes | Idempotent checkout retries; server prices and stock checks; transactional holds; one-time paid stock deduction; raw-body webhook HMAC; captured payment/amount/currency/order checks; unknown-order webhook retries; admin payment reconciliation and reference recovery; origin checks, rate limits, security headers, private-file protection | Real Razorpay account tests. Uncertain or abandoned payable orders intentionally keep stock; refund-based closure and credit notes are not implemented |
| 1. Registration / login | Salted scrypt passwords; random hashed session identifiers; HttpOnly/SameSite cookies, Secure with HTTPS; session rotation; logout; password change invalidates all sessions; customer/admin authorization | Transactional email, email verification, forgotten-password recovery, MFA and administrator account recovery remain outstanding |
| 2. Order history | Authenticated customer history and order details; server ownership checks; saved guest-order import requires secret token and matching account email; invoice access checks | Older guest orders without their token need an operator-assisted verification process; no automatic email-only linking |
| 3. Retail / gym / wholesale prices | Existing approved retail prices preserved; administrator-editable gym/wholesale prices per variant; server chooses approved tier; private business prices not published in retail catalogue | Owner must supply approved business prices. Missing tier prices block checkout. Volume breaks, MOQ and trade-credit rules are not yet implemented |
| 4. Dealer registration / approval | Gym/wholesale application, business name and optional GSTIN; pending/approved/rejected states; admin approval/revocation and audit records | Business verification remains an administrator responsibility |
| 5. Products / inventory | Administrator product create/edit, descriptions, images, HSN/rates and stable variants; retail/business prices; physical on-hand and available stock; optimistic locking; adjustment reason and audit log | Enter real opening stock. Image-file upload and bulk CSV import are not implemented. Existing variants are retained; use zero stock instead of deletion |
| 6. Shiprocket | Credential/test gates; API-user authentication; prepaid custom orders; serviceability/rates; AWB, pickup, label, manifest and tracking; duplicate/uncertain operation guards | Valid API user, pickup configuration, real parcel measurements and account-specific tests. Dynamic checkout rate quotation, automated tracking updates and uncertain-shipment recovery are outstanding |
| 7. GST / invoices | Configurable seller and product data; inclusive-price extraction; CGST/SGST or IGST; shipping tax; one invoice per capture; immutable snapshots; India financial-year numbering; access-controlled printable invoice / browser PDF | Accountant-approved classifications and invoice layout. GST is disabled by default. GST e-invoice/IRN, e-way bills, credit notes and accounting exports are not implemented |
| 8. Order management / fulfilment | Administrator order/customer/item details; payment reconciliation/recovery; processing/shipped/delivered transitions; tracking references; shipping actions and audit trail | Automated refund/return workflow, transactional email notifications and pagination beyond the most recent 100 orders are outstanding |
| 9. Images / product facts | Existing actual Nitro Mass 5 kg photo retained; three original manufacturer references checked and copied unchanged into local assets; catalogue/variant/price regression test | Owner-approved gold MV PNG now used unchanged in the header/footer/favicon; no replacement designed. Nitro Mass 3 kg and Musclevite photos/details and exact flavour-specific photography still need confirmation. Manufacturer nutrition/ingredients need approved label data |
| 10. Production configuration | Non-root container template, read-only root, persistent private DB, TLS reverse-proxy configuration, health check, shutdown handling, online backup utility, explicit live-payment approval gate; PR branch cannot run Pages deployment | No host provisioned or deployed. Docker images/compose not built here. DNS, HTTPS, secrets, monitoring, scheduled encrypted backups and staging-to-production acceptance need the selected hosting account |

## Verification

- `npm run check`: syntax validation across the backend and new browser modules.
- `npm test`: 24 automated unit/integration tests use temporary databases and isolated provider mocks. Coverage includes passwords, authorization, dealer pricing, order isolation, guest ownership, checkout retries, last-unit concurrency, failure reservations, duplicate webhooks, GST invoice stability, Shiprocket workflow, legacy migration, production startup gates and online backup restoration.
- Local Chromium review: five-product storefront; cart; checkout remains disabled; registration; dealer application/approval; administrator product editor retains retail prices for an approved dealer; desktop and 390px mobile review; no page JavaScript errors or storefront mobile overflow.
- Existing manufacturer PNG URLs returned HTTP 200 before unchanged copies were saved locally.
- No live payment, live courier call, production deployment or production account test was performed. Mock credentials appear only in test fixtures.

## Existing retail prices retained

| Variant | Customer price |
|---|---:|
| Potency Whey 5 lb Chocolate / Coffee | ₹4,999 |
| Nitro Mass 5 kg Double Rich Chocolate bucket | ₹3,499 |
| Nitro Mass 3 kg (pack to confirm) | ₹2,599 |
| Pro Creatine 100 g Blueberry / Cranberry | ₹899 |
| Sturdy Pre-Workout 250 g Watermelon | ₹1,399 |
| Musclevite (pack details to confirm) | ₹699 |

## Required external inputs

1. Missing verified pack assets/label data; the approved gold logo is now supplied and integrated.
2. Real stock, approved gym/wholesale prices, delivery fee and service region.
3. Business address, support email, approved policies and accountant-reviewed GST configuration.
4. Razorpay test/live merchant accounts and server-held key pairs/webhook secret. Live activation requires separate owner approval.
5. Shiprocket dedicated API-user credentials and pickup location; controlled account-specific testing before enabling.
6. Selected production hosting/domain/DNS access, private persistent storage, monitoring and backup destination.
7. Transactional-email service/account for the outstanding email verification, password recovery and notification stage.

Enter secrets through the host's secret manager or private environment settings, never source control or chat. Keep `PAYMENTS_ENABLED`, `RAZORPAY_TESTED`, `LIVE_PAYMENTS_APPROVED`, `SHIPROCKET_ENABLED` and `SHIPROCKET_TESTED` false until the corresponding controlled tests and owner approvals are complete.

## Password-protected staging preparation

A separate staging entry point, whole-site password protection, isolated synthetic-data initialization and exact Render deployment runbook are prepared in [STAGING.md](STAGING.md). The expanded suite has 27 passing tests, including staging authentication and integration-disable checks. No hosting resources, real HTTPS URL or live integrations have been provisioned.
