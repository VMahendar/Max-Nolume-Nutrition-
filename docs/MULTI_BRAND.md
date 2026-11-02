# Multi-brand storefront preview

The existing store now uses charcoal, warm gold and ivory with a compact shopping header, product search, brand navigation, category filters and responsive product cards. Customer prices, variants, carts, accounts, dealer approvals and the single Node.js/SQLite commerce backend are preserved.

## Brands and distribution

- Unicorn Pro Series is the current catalogue brand and the only owner-confirmed Tamil Nadu distributorship. The homepage and brand card state this relationship explicitly.
- Brand names previously mentioned by the owner were references only. The storefront shows a generic “Multi-brand store / More brands coming soon” card; no future supplier names or distributor relationships are promised.
- `public/brands.json` supplies presentation copy and explicit distributor flags. A stocked product's brand controls availability and the brand filter. Additional product brands receive a generic card automatically, without a distributor badge.
- The administrator product editor includes a Brand field. The API validates and persists it and retains it on legacy edits that omit the field. Original seeded products receive their legacy Unicorn brand when loaded from an older database, without resetting inventory or orders.

## Distributor certificate — original asset pending

The owner supplied a chat preview of a Unicorn Pro Series authorized distributor certificate naming Max Volume Nutrition and Revakanya Industries Pvt. Ltd. The original attachment bytes are unavailable in this execution workspace and the PR branch, so the certificate has not been regenerated, reconstructed or published.

A responsive certificate figure and full-size image link are prepared in the official distributor section. It remains hidden, with no image request or broken link, while the Unicorn entry's `certificateImage` in `public/brands.json` is null. To activate it, add the original image as `public/assets/unicorn-authorized-distributor-certificate.png` (or the actual JPG/WebP filename) and set `certificateImage` to its `assets/...` path. The preview appears only after the original image loads; missing or external images remain hidden. The certificate receives no logo color filter, crop or image edit.

## Logo and media

The owner requested removing “WHOLESALE & DISTRIBUTION”, “EST. 2026” and the lower-right star from the newly shared full logo. `public/max-volume-logo-wide.png` is the resulting image edit, used as one image containing the gold MV symbol and MAX VOLUME NUTRITION lettering in the header and footer. No separate HTML tagline is displayed. Responsive frames hide blank outer background while retaining the artwork's proportions. A local SVG display filter (`public/brand-cutout.svg`) makes the neutral textured backdrop transparent, so the logo sits directly on the header/footer charcoal without a rectangular panel. It retains the source RGB values and does not rewrite the logo PNG.

This is an image-edited derivative, not a byte-identical copy of the chat attachment. The earlier approved source and `public/max-volume-logo.png` remain unchanged as retained originals; the latter is still the gold MV favicon.

Nitro Mass keeps the owner's actual bucket photograph. A clean pack image is still needed. Musclevite and Nitro Mass 3 kg assets/details remain pending as documented in MEDIA.md.

## Preview limits

The existing Render Free preview is used. The staging entry point forcibly disables payment collection and Shiprocket. GST remains disabled in the synthetic seed. No bank account, payment credentials or GST registration are needed to browse the preview. No real customer orders or live courier operations are performed. Free instance test data can reset after a restart.

## Verification

- `npm run check` and `npm test`, including product brand persistence, admin authorization, unchanged retail/trade prices and private trade-price visibility.
- Local Chromium: homepage and original logo, two initial cards (current brand and generic coming-soon notice), exactly one confirmed distributor badge, search, brand/category filters, cart, account login, administrator authorization and disabled payments.
- Layout widths: 320, 390, 650, 768, 1024 and 1440 pixels. No document overflow or page JavaScript errors.
- Hosted browser verification is limited by this execution environment's network policy; Render deploy state and logs are checked independently.
