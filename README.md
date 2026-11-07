# MAX VOLUME NUTRITION

Sports nutrition retail, wholesale and distribution — Chennai, Tamil Nadu.

**Current official source:** [GitHub main](https://github.com/VMahendar/Max-Volume-Nutrition-/tree/main)  
**Current working preview:** https://max-volume-nutrition-preview.onrender.com/  
**Launch readiness & required external setup:** [docs/LAUNCH_STATUS.md](docs/LAUNCH_STATUS.md)

## One website, one source of truth

Render serves the advanced Node.js/SQLite storefront from `public/`, using `server.mjs`. The source branch is `main`. The separately retained root `index.html`, `premium.css`, `retail.css` and `app.js` are static/Codex compatibility files; updating them alone **does not** update Render.

Historic Wix and ChatGPT-hosted versions are not the current production destination. Please do not advertise their old links. The custom domain has not yet been bought or connected.

## Identity

Use the **owner's original** Max Volume Nutrition logo from `public/max-volume-logo-wide.png` and `public/max-volume-logo.png` without recreating the lettering, proportions, colours or monogram. The current storefront uses original navy/royal-blue merchandising design; it is not a GNC visual clone. The black/gold **Whey product packaging** is retired and must not be reintroduced. The logo must not be redrawn.

Unicorn Pro Series is the current Tamil Nadu distributor collection; more brands are coming soon. Do not claim exclusive distribution without the supplier's written confirmation.

## Public catalogue — customer prices only

| Variant | Retail price |
|---|---:|
| Potency Whey 5 lb Chocolate | ₹4,999 |
| Potency Whey 5 lb Coffee | ₹4,999 |
| Nitro Mass 5 kg **bucket** | ₹3,499 |
| Nitro Mass 3 kg **box** | ₹2,599 |
| Sturdy Pre-Workout 250 g | ₹1,399 |
| Pro Creatine 100 g Blueberry | ₹899 |
| Pro Creatine 100 g Cranberry | ₹899 |
| Musclevite Multivitamin | ₹699 |

Wholesale and gym tiers are stored in the **non-public** `data/products.json` seed and the private database. The public `public/catalog.json` contains no trade prices. Approved trade tiers are delivered only to authenticated, administrator-approved dealer accounts.

Product photographs must match the **exact** pack and flavour. No incorrect picture should be substituted for missing current packs; verify front, back, ingredient and nutrition label before publishing.

## Commerce functionality

- Customer registration, login/logout, private order history and account password changes.
- Dealer application, private approved trade pricing, administrator approvals.
- Admin product/stock configuration, GST/invoices, order/reconciliation, refund/shipping-management architecture.
- Frontend search, filters, cart and WhatsApp enquiry.
- Razorpay and Shiprocket integrations exist in the codebase but remain **disabled** until verified merchant credentials, business checks and production infrastructure are ready.
- The live Render preview uses `npm run start:staging`, preventing any real payment or shipment. The Render Free filesystem is not suitable for durable production orders without further work.

## Tests and local operation

Requires Node.js 24+.

```sh
npm run check
npm test
npm run launch:audit -- --report
```

CI also runs Playwright Chromium desktop/mobile shopping and account/wholesale flows. A strict `npm run start:production` command is included but must refuse to start until all launch prerequisites pass. Do not change the live Render service to it prematurely.

Consult [docs/PRODUCTION.md](docs/PRODUCTION.md), [docs/STAGING.md](docs/STAGING.md) and [docs/LAUNCH_STATUS.md](docs/LAUNCH_STATUS.md) before a production cutover.

## Mobile apps

The installed home-screen app opens `/mobile-app.html` with products, pack choices, prices and the same WhatsApp cart as the website. Normal browser visits to that app URL show installation guidance first. Both views refresh retail prices from the backend and verify them again before preparing a WhatsApp order; changed totals require review. It uses the original MVN logo and a network-only service worker: customer accounts, stock, prices and orders are never cached. Internet access is required. Installation does not enable online payments.

Android and iPhone development preview projects and release requirements are in [mobile/README.md](mobile/README.md). These are not signed store releases.

## Retail festival campaigns and distribution news

The website and installed app show separate Unicorn Pro Series certificate and Glob Tech launch sections. App tabs link directly to shopping, offers, launches, the certificate and the account. Instagram story links are references; the source footage was not retrievable and is not embedded as a video.

Retail launch campaigns are initialized once from `data/retail-campaigns.json`, preserving later administrator edits and deactivations. `MVNOPEN5` gives 5% off, capped at ₹300; `DIWALI8` gives 8% off, capped at ₹400. Both require a ₹1,500 products subtotal, run 7–9 November 2026 IST, and expire at midnight starting 10 November. They appear on both platforms. Only one code applies. These are separate from trade pricing and trade free-gift schemes; approved wholesale/gym accounts cannot use retail promotion quotes. No wholesale source prices are included in the retail campaign configuration.

Administrators can manage draft/active campaigns, audiences, dates, minimums, caps and terms in Offers. Discounts are priced server-side and revalidated before the WhatsApp message. They are quotations, with stock, delivery and acceptance confirmed by the store; no automatic payment or redemption record is created. Future campaigns need explicit new dates and amounts. Existing consent preferences handle opt-in festival/launch announcements; automatic push/email/WhatsApp sending is not configured.

## App-specific interface and WhatsApp automation

The website keeps a permanent Open MVN app link. The app now serves an independent compact header, search and tab-based screens; the catalogue and WhatsApp ordering logic remain shared. Confirmed MRP, regular retail price, limited offer price and expiry are shown without introducing unverified MRPs. Expired campaigns refresh automatically.

WhatsApp-only reminder and campaign delivery is implemented with a persistent queue and administrator controls, but is paused and blocked on staging until provider and production setup are complete. See [the delivery setup guide](docs/MARKETING_AUTOMATION.md). No customer messages were sent during implementation.

The website app entry is **Install MVN app**, with the native prompt when available and Android/iPhone instructions otherwise. It does not open the app shopping interface inside a normal browser. Standalone-mode detection controls presentation only; it is not an authentication or device-attestation mechanism. Product shopping on the regular website remains available.
