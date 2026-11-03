# Launch dependencies and acceptance gates

**Free hosting selected:** start with [FREE-HOSTING.md](FREE-HOSTING.md) for the Worker/D1 path and its account/setup checklist. WordPress hosting is an alternative, not a requirement for that path. Merchant/tax/legal/stock verification and explicit live approval still apply. Do not run two authoritative checkouts.

All unchecked items remain open. Credentials are absent, not placeholders for working services. Do not enable online checkout until the applicable gates pass.

## Owner / infrastructure
- [ ] Provision WordPress + WooCommerce PHP/database hosting and a staging domain. GitHub Pages cannot run commerce PHP.
- [ ] Approve production domain and DNS changes; configure TLS, WordPress HTTPS URLs, secure cookies and renewal monitoring. Back up DNS before changes.
- [ ] Provide deployment/admin access using a password manager; do not paste secrets into Git, frontend code or issue comments.
- [ ] Set database/file backups with off-site encrypted copies; restore a staging copy and record recovery time. Protect admin with MFA, least privilege, updates, WAF/rate limiting and login throttling.
- [ ] Configure SMTP transactional email, SPF/DKIM/DMARC, delivery monitoring, logs and alerts. WordPress mail is not evidence of delivery.
- [ ] Exclude authenticated and Woo session traffic from CDN/page caching. Verify retail/gym/dealer responses in distinct sessions and after revocation.

## Products / branding
- [ ] Supply approved MV internal-grid monogram. Existing `MV` text is preserved; no replacement was invented.
- [ ] Verify the existing revakanya.com whey/pre-workout/creatine image references and permission to use them. HTTP 200 was checked; authenticity/license/pack correspondence were not established.
- [ ] Supply separate approved Nitro Mass 3 kg and **5 kg bucket** imagery and multivitamin image. No substitute photo is supplied.
- [ ] Confirm manufacturer, ingredients/nutrition/directions, labels, legal claims, SKU mapping, MRP, HSN/GST and actual inventory for every pack. Supply batch/expiry tracking integration or operations process; it is not implemented here.
- [ ] Seed drafts, inspect each product, enter stock, remove `_mvn_review_required` only after review and publish. The CLI never overwrites existing SKUs.
- [ ] Supply distribution evidence before making official/exclusive/authorised claims; approve additional brands and stock before publishing them.

## Payments — Razorpay
- [ ] Approved merchant account/KYC; separate **test** key ID/secret and webhook secret; later live keys only after explicit owner approval.
- [ ] Install the current vendor-supported WooCommerce integration; record version, source and settings. Configure INR and HTTPS webhook/callback URLs shown by that installed plugin.
- [ ] Verify server-created orders, signature verification and webhook signature verification. Invalid signatures must fail, repeated/out-of-order delivery must not duplicate payment or stock transitions.
- [ ] Exercise test UPI/card/netbanking success/failure/abandonment; amount/currency mismatch; provider timeout; webhook-before-browser; webhook-after-browser; duplicate event; refund and duplicate refund.
- [ ] Disable COD/bank transfer unless deliberately approved; never manually mark an order paid merely to complete a test.

## Fulfillment — Shiprocket
- [ ] Business account, API credentials, approved pickup address/phone and courier settings. Keep credentials in the vendor plugin's server-side settings.
- [ ] Select maintained Woo integration; verify exact supported version and webhook authentication. Configure shipment creation once per Woo order and retry/reconcile behavior.
- [ ] Validate origin/destination pincodes, real serviceability, live charge/weight/dimensions, unavailable courier, timeout, tracking, delivered/return/RTO events and event replay. No shipping tariff or ETA is invented here.

## Tax / legal / accounting
- [ ] Accountant verifies legal name, business address, GSTIN, product HSN/rates and inclusive/exclusive price interpretation; configure Tamil Nadu intra-state CGST/SGST and inter-state IGST correctly in Woo.
- [ ] Select one invoice/credit-note integration; configure sequential numbers, seller/buyer GSTIN, place of supply, tax lines, PDF/export and refund credit notes. Replays must not duplicate accounting documents.
- [ ] Approve privacy/terms/shipping/returns/cancellation policy drafts, support email and grievance details. Publish approved policies in WordPress; drafts make no fictional commitments.

## Staging acceptance and production approval
- [ ] Complete the matrix in TESTING.md on real WordPress/Woo/provider test-mode integrations, recording versions/results and redacted order/event IDs.
- [ ] Verify admin product/stock/order management and Woo Analytics; verify the supplied gross-profit estimate against captured costs; inventory batch/expiry, dealer-specific per-user prices, volume-break discounts and automated fulfillment reports remain development gaps.
- [ ] Verify partner signup, approval/revocation, tier catalogue, MOQ, quote review/conversion, correct invoice and order ownership across customer accounts, admins, gyms and dealers. No pending applicant gets prices.
- [ ] Configure full Woo shop filters/pagination and verified product attributes; approve a WordPress theme/template that retains the navy/silver/blue identity across product/account/checkout pages. Those native pages are not branded by the homepage shortcode.
- [ ] Approve canonical domain, sitemap, product schema eligibility, Open Graph, Search Console ownership, consent-managed GA4 and Merchant Center feeds. No analytics identifiers or ownership approvals exist here.
- [ ] Obtain explicit owner approval to enable live checkout, change production DNS/deploy and charge customers. Record approval and rollback plan.
