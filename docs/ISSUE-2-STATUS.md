# Issue #2 coverage

This PR leaves Issue #2 open. “Implemented” means code exists; only executed checks in TESTING.md are claimed as tested. Credentials are not the only remaining work.

| Requirement | Delivery / remaining work |
|---|---|
| Preserve website / navy identity / enquiries | Existing HTML, CSS, images and WhatsApp flow retained; matching native Woo template and stylesheet added. Original grid logo asset absent. |
| Eight public INR prices / variants | Implemented issue prices in static mode, SKU-linked authoritative prices in Woo mode. No procurement data in static assets. |
| Catalogue search / filters / sort / pagination | Static search/category/price bands/price sort; native Woo catalogue form supports brand/category/flavour/pack/stock/price plus Woo sorting/pagination. Only approved Unicorn attributes seeded. Tier price-band filtering still follows Woo retail lookup bands. |
| Product gallery / details / related products / cart | Uses native Woo products and simple SKU variants. Manufacturer/MRP/HSN/ingredients/nutrition/stock/image verification pending; no fabricated values. Pincode serviceability needs provider integration. |
| Retail accounts / addresses / guest cart / coupons / tax / orders / history | Routed to native Woo classic pages with navy template. Requires actual WordPress setup and integration acceptance. |
| Gym/dealer approval / pricing / MOQs | Custom private fields, authenticated application, privileged approval/revocation with audit, tier visibility/query/cart validation and repricing. One tier price per product; per-user pricing and quantity-break discounts remain development work. |
| Quotes | Existing multi-item WhatsApp enquiries preserved; authenticated single-product recorded quotes use the same Woo order database, custom non-payable status, throttle and email submission notifications. Multi-line persisted quote editor and automated negotiated-price acceptance remain development work. |
| Razorpay | Delegated to a maintained vendor Woo plugin; no custom provider adapter in this PR. Installation/configuration/version verification, signatures/webhooks/idempotency and real test-mode acceptance pending. Checkout/pay-for-order disabled by default. |
| Shiprocket | Vendor integration selection/configuration and real serviceability/quote/shipment/tracking/return/RTO acceptance pending. No fake rates or ETA. |
| GST / invoices / credit notes | Native Woo tax configuration plus accountant-selected single invoice integration required. Sequential accounting/PDF/export/credit-note implementation not supplied by this plugin. |
| Admin / reports | Woo management for products/orders/coupons/stock/refunds; custom simple-product tier/private cost fields, partner profile review and real-data 30-day tier revenue/margin estimate. Reporting code needs Woo integration tests; Woo Analytics provides stock/top-seller reports. Batch/expiry tracking and custom fulfillment reports remain gaps. |
| Brands / homepage / policy / contacts | Existing approved Unicorn presentation retained; draft policy page and configurable WordPress pages. No unstocked brand claims, invented combos or fake bestsellers. Dedicated richer brand landing/content administration remains follow-up beyond native Woo pages. |
| SEO / security / operations | Accessible input labels/focus/drawer, build isolation, nonce/capability checks, private/no-store headers, tier queries and fail-closed Store API. WordPress/Woo supplies canonical/product schema/sitemap where configured. Production domain/OG/GA4/Search Console/Merchant Center, consent, backups, WAF/login throttle and monitoring need setup and acceptance. |
| Tests / deploy / PR | Local JS, PHP contract/lint and desktop/mobile checks plus CI and deployment/runbooks. Full Woo/customer/provider/invoice/admin E2E remains unexecuted. |
