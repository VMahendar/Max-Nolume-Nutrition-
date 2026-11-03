# Run and deploy

## Local storefront
Node 24+, no npm dependencies required:

```sh
npm run check
python3 -m http.server 8080
```

Open http://localhost:8080. Static mode supports browse/retail price discovery/quote enquiries only. It never accepts money or claims live stock. Browser smoke tests require Python Playwright plus Chromium (`python3 tests/browser.py`). PHP contract tests require PHP 8.2+: `php tests/pricing.php`.

## WordPress staging

Use current supported WordPress/WooCommerce, PHP 8.2+, MySQL/MariaDB and HTTPS. Create staging separately from production. Back up before installing or updating plugins. Restrict staging indexing/access at the host. No Docker deployment is assumed; no hosting credentials are configured in this workspace.

1. Build `npm run build`. Copy `dist/max-volume-commerce` to `wp-content/plugins/max-volume-commerce` or zip that directory and upload through Plugins. Do **not** upload `.env`, repository history, tests or private configuration to a public web directory.
2. Install WooCommerce from its official distribution and complete its setup. Set store location Tamil Nadu, India, INR, physical shipping zones, reviewed tax configuration and stock management. Enable guest checkout and account registration in Woo settings as approved; use Woo password setup/reset emails. Configure SMTP and host login/checkout rate limiting.
3. Activate `max-volume-commerce`. With WP-CLI, run `wp mvn seed`. Running it twice leaves existing SKUs unchanged. All new products are drafts, stock zero and held for review. Review and publish using Woo Products; fill private gym/dealer price/MOQ fields only in the privileged editor. Empty allowed tiers means all; otherwise comma-separated `retail,gym,dealer` with no spaces. Keep private pricing out of product descriptions, excerpts, attributes, media names and public custom fields.
4. Create a blank/full-width home template with `[mvn_storefront]`, a My Account page with `[woocommerce_my_account]`, a classic Cart page with `[woocommerce_cart]`, and classic Checkout page with `[woocommerce_checkout]`. Assign them under Woo settings. **Do not use Cart/Checkout blocks**; the Store API is disabled. A standalone navy template and stylesheet handle native commerce and partner pages. Review them against the approved brand on staging, including the missing original logo asset.
5. Create a Wholesale page containing `[mvn_partner_application]` and `[mvn_quote_request]`. Add it to navigation. Registration/email/password reset use native My Account. Admins review applications under Users → Edit User → Partner review; selecting retail revokes special tier access. Business records are private user metadata; apply approved retention policy. Quotes appear in Woo Orders and My Account as “Quote requested”. Staff review stock, tier price, tax and shipping before converting to payable pending orders.
6. Create `/policies/` from `policies.html` content, replace all review text with owner-approved terms and business details. Build native Shop categories/brand attributes and filters from verified data. Do not add unavailable brands, images, claims or fake bestsellers.
7. Install/configure vendor-maintained Razorpay and Shiprocket Woo integrations and the accountant-selected GST invoice system. They must operate on the **same** Woo orders. Secret names in `.env.example` are a handoff checklist, not an automatic configuration loader. Enter secrets only server-side via the selected plugins or approved host secret management; validate those plugins' exact configuration names in their documentation.
8. Keep checkout disabled until prerequisites are complete. After staging provider setup and testing approval, enable the explicit gate with `wp option update mvn_checkout_enabled yes`. To disable: `wp option update mvn_checkout_enabled no`. Remove each reviewed product's `_mvn_review_required` hold through the privileged custom field/WP-CLI workflow, for example `wp post meta delete PRODUCT_ID _mvn_review_required` only after verification. Never toggle production enablement without owner approval.
9. Execute TESTING.md and LAUNCH-CHECKLIST.md. Do not reuse staging test/live secrets. Confirm vendor webhook signature checking, duplicate handling and refund behavior from actual logs. Do not enable COD or offline payments as a workaround.
10. After owner approval, point the approved commerce domain at hosting using its documented DNS target, retain Pages until cutover is verified, issue/verify TLS, update WordPress site/home URLs, permalinks/canonical/sitemap and provider callback URLs. Test redirect loops and mixed content. Keep a rollback DNS record and database backup. Restore/test staged backup before promotion.

## GitHub Pages and CI
The existing main-only Pages workflow remains. It now builds and publishes **only `dist/site`**, containing the public website. PR CI runs JS tests/build, PHP lint and pricing contract tests, and uploads the plugin directory for staging review. CI is not provider acceptance. No production deployment is performed by this change; merging main will invoke the repository's existing Pages workflow.
