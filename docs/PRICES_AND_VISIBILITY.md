# MRP, selling prices and product image visibility

## Official source references

The owner designated https://unicornproseries.com/ as the reference source. Product pages were read on 3 November 2026 (Asia/Kolkata). Only the published regular/list reference price is added as MRP metadata; existing customer selling prices are unchanged.

| Existing product | Official regular/list reference | Existing selling price | Source |
|---|---:|---:|---|
| Potency Whey | ₹8,599 | ₹5,500 | https://unicornproseries.com/product/potency-whey/ |
| Pro Creatine | ₹1,499 | ₹899 | https://unicornproseries.com/product/pro-creatine/ |
| Nitro Mass 5 kg | Not confirmed for this pack | ₹3,499 | https://unicornproseries.com/product/nitro-mass/ |
| Sturdy Pre-Workout Watermelon 250 g | ₹2,199 (owner-confirmed MRP, 11 Nov 2026) | ₹1,800 | Owner-provided pricing; verify printed pack label |

The Nitro page exposes a sale-price range, and the pre-workout page has a range across flavours. Those range endpoints are not treated as pack-specific MRPs; the pre-workout MRP shown above comes from the owner. Manufacturer sale prices do not replace the owner's selling prices. Original pack/variant labels are retained; exact label/size/flavour matching and printed package MRP remain part of the pre-production media check.

## Display and administrator editing

Each variant can have optional `mrpPaise`. Cards and product details show a crossed-out MRP only when it exceeds the actual selected selling price. Equal prices have no crossed-out discount. Unknown or invalid MRPs are omitted. Gym/wholesale prices remain selected by the backend for approved accounts.

The administrator product editor includes MRP inputs in rupees. The API stores integer paise, preserves an existing MRP when omitted, supports explicit null to clear it and rejects an MRP below any configured selling price. A pre-existing form-ID/name collision that prevented product saves has been fixed. Existing retail prices are not edited by MRP fields.

Legacy catalogues can read these reference MRPs only when product ID, variant ID and label match, no explicit MRP override exists and all selling prices are within the reference. Stock, orders and prices are not reset.

## Images and existing records

The customer storefront excludes products with no image and variants with explicit null images. Variant images otherwise inherit the product image. If a photo fails to load, affected variants/cards are removed and saved-cart lines are sanitized. No empty photo placeholders are displayed. Backend products, inventory and historical order records are retained for administration.

The owner's clean 5 kg bucket upload, `public/assets/Screenshot_2026_1103_003852.jpg`, is now used unchanged. Both product and 5 kg variant references are updated. Existing catalogues using the exact old photo path read the new reference without resetting prices, stock or historical data; custom image overrides and the explicitly image-less 3 kg pack are preserved.

## Verification

Automated tests cover image-less and broken image filtering, saved-cart cleanup, unchanged underlying records/prices, valid MRP comparison, secure admin MRP persistence/clearing and legacy metadata overrides. Local Chromium verifies desktop/mobile cards and details, the admin MRP save path, missing-image behavior, the original certificate and existing account/dealer/store functionality. Payment and shipping integrations remain disabled in staging.
