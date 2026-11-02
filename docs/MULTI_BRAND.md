# Multi-brand storefront preview

The existing store now uses charcoal, warm gold and ivory with a compact shopping header, product search, brand navigation, category filters and responsive product cards. Customer prices, variants, carts, accounts, dealer approvals and the single Node.js/SQLite commerce backend are preserved.

## Brands and distribution

- Unicorn Pro Series is the current catalogue brand and the only owner-confirmed Tamil Nadu distributorship. The homepage and brand card state this relationship explicitly.
- MuscleTech and ON are planned additions, shown as Coming soon while they have no catalogue products. No prices, products or distributor relationships were invented. The owner has not confirmed whether ON should be expanded to another name.
- `public/brands.json` supplies presentation copy and explicit distributor flags. A stocked product's brand controls availability and the brand filter. Additional product brands receive a generic card automatically, without a distributor badge.
- The administrator product editor includes a Brand field. The API validates and persists it and retains it on legacy edits that omit the field. Original seeded products receive their legacy Unicorn brand when loaded from an older database, without resetting inventory or orders.

## Logo and media

The approved original upload, `ChatGPT Image Oct 30, 2026, 04_06_49 PM.png`, and the served `public/max-volume-logo.png` remain byte-identical and unmodified. The header, footer and favicon retain the existing approved PNG. No new brand logos were invented. The new horizontal reference shown in chat is not present as a repository file; this revision preserves the existing approved emblem asset.

Nitro Mass keeps the owner's actual bucket photograph. A clean pack image is still needed. Musclevite and Nitro Mass 3 kg assets/details remain pending as documented in MEDIA.md.

## Preview limits

The existing Render Free preview is used. The staging entry point forcibly disables payment collection and Shiprocket. GST remains disabled in the synthetic seed. No bank account, payment credentials or GST registration are needed to browse the preview. No real customer orders or live courier operations are performed. Free instance test data can reset after a restart.

## Verification

- `npm run check` and `npm test`, including product brand persistence, admin authorization, unchanged retail/trade prices and private trade-price visibility.
- Local Chromium: homepage and original logo, three initial brand cards, exactly one confirmed distributor badge, search, brand/category filters, cart, account login, administrator authorization and disabled payments.
- Layout widths: 320, 390, 650, 768, 1024 and 1440 pixels. No document overflow or page JavaScript errors.
- Hosted browser verification is limited by this execution environment's network policy; Render deploy state and logs are checked independently.
