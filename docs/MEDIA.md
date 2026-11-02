# Existing catalogue and brand asset checklist

The existing storefront uses the owner's gold MV logo, a charcoal/gold/ivory theme, the approved catalogue and original selling prices. The original logo upload is preserved as `public/max-volume-logo.png` and remains the favicon; the header/footer use the owner-requested wide derivative described below.

Three unchanged manufacturer-reference images were downloaded after their existing URLs returned HTTP 200 with PNG content:

| Local file | Existing source |
|---|---|
| `public/assets/potency-whey.png` | `https://revakanya.com/assets/imgs/Potency%20Whey.png` |
| `public/assets/pro-creatine.png` | `https://revakanya.com/assets/imgs/Pro%20Creatine.png` |
| `public/assets/sturdy-pre-workout.png` | `https://revakanya.com/assets/imgs/Sturdy%20Pre%20Workout.png` |

They remove hotlink dependence, but remain generic manufacturer references. Confirm packaging, usage permission and exact size/flavour match before launch. Existing databases keep their saved image paths until an administrator updates them; the new local assets are available for selection.

Owner inputs still required:
- Actual Nitro Mass 3 kg pack photo and exact pack/flavour confirmation.
- Actual Musclevite photo, pack/tablet count and confirmed variant details.
- Confirmed photographs matching each whey, creatine and pre-workout flavour/size.
- Verified manufacturer ingredients, nutrition, allergens, directions and warnings from the relevant labels.

Products and variants without a usable image are hidden from the customer storefront. Their backend records, inventory and historical orders are retained. Broken product images are hidden too, and affected saved-cart lines are removed. No ingredient facts, pack sizes, stock quantities or discounts have been invented.

Logo verification: served PNG bytes match the approved upload; header/footer retain the original 1291:1218 aspect ratio. Browser checks cover desktop, tablet and narrow-mobile sizes; favicon links reference the same PNG on every HTML page.


## Owner-requested logo text removal

The current header/footer use `public/max-volume-logo-wide.png`, an image-edited derivative of the owner-shared full lockup. It contains the gold MV emblem and MAX VOLUME NUTRITION only. WHOLESALE & DISTRIBUTION, EST. 2026 and the lower-right star were removed at the owner's request. The original gold PNG is preserved separately and remains the favicon. The edited derivative is not byte-identical to the original attachment.


The header/footer now apply `brand-cutout.svg#gold-on-transparent` to the existing wide PNG. This display filter retains the gold RGB values and removes the neutral textured backdrop, so each logo blends with the full charcoal surface. The wide PNG itself is unchanged by this fix. A generative background-removal candidate was rejected because it altered lettering; it is not used by the website.


## Distributor certificate original

The official distributor section uses the owner's unchanged upload `public/assets/IMG-20261102-WA0019.jpg`, added in commit bb527dbf38f1043bbaa784261df73885e58889f6. It displays the complete document, with a full-size link. No image generation, crop, background filter or text edit is applied. The original public asset is served by the existing Node.js backend; no external image origin is needed.


## Requested clean Nitro Mass 5 kg photograph — file pending

The owner supplied a clean 5 kg Double Rich Chocolate bucket image in chat. Its original file bytes are not present in the workspace, PR comments or assets folder. The previous actual bucket photo remains in use pending that exact upload; no generated/reconstructed product photo is substituted. Add the original image to public/assets on codex/complete-store-review, as with the certificate, then update the product and 5 kg variant image paths. The explicitly image-less 3 kg variant and Musclevite card are hidden from the storefront.
