# Product galleries — current-pack media import pending

The requested manufacturer source is https://unicornproseries.com/. The owner confirmed that current Potency Whey stock uses white-and-blue packaging only and requested full original front/back/other views for the existing products. No replacement packaging or label images are generated.

## Implemented in PR #1 and the Free preview

- Pack-specific `images` arrays at product or variant level; local/previous single-image catalogues continue to work.
- Thumbnail selection, original-size dialog, zoom/panning, previous/next controls, keyboard arrows, Escape and an original-file link.
- Full photo proportions and normal image colours; no cropping, logo filter or background blending on product photos.
- Duplicate views removed. Failed secondary views are omitted while a working photo remains. Products are hidden only when the selected pack has no usable photos.
- Explicit image-less variants do not inherit another pack's gallery. Variant-specific galleries do not inherit a different flavour's primary photo.
- Administrator product gallery JSON field and per-variant gallery support. Image sources are validated using the existing approved local/manufacturer policy, limited to 20 photos, and retained when omitted from legacy product updates.
- Selling prices, MRP rules, inventory, orders, dealer approval, the gold MV logo and the original distributor certificate are unchanged.

Example gallery metadata (illustrative paths, not imported manufacturer photos):

```json
{
  "images": [
    {"src": "assets/product-front.jpg", "label": "Front", "alt": "Original front of selected pack"},
    {"src": "assets/product-back.jpg", "label": "Back", "alt": "Original back label of selected pack"}
  ]
}
```

The main image remains first unless it is explicitly included in the gallery order. A variant's own `images` array follows only that variant; explicit `image: null` with no own photos remains hidden. Clear arrays explicitly to remove gallery views.

## Blocked original-photo import

The official product-page text can be read through the web tool. Earlier direct downloads returned proxy HTTP 403; the current task's proxy connection is unavailable. Current Cloud Environment observations report an enforced network allowlist containing only `revakanya.com`; `unicornproseries.com` is absent. Supplying the website URL does not change that environment setting.

The owner needs to add `unicornproseries.com` to the Cloud Environment network allowlist, or provide the original pack photographs in the existing PR assets folder. Then the original official gallery files can be downloaded, inspected for current white-and-blue packaging and exact pack/flavour matching, and added without image processing. Only views actually supplied by the manufacturer will be labelled front/back; no missing views or new product prices are invented.

The white-and-blue Potency Whey image replacement and official multi-view imports have **not** been applied yet. The owner explicitly retired the black-and-gold Whey pack: seed catalogue image references are cleared, the storefront excludes the exact retired local artwork even in saved catalogues, and the hero uses the previously approved Nitro Mass 5 kg bucket instead. Whey remains hidden until usable current-pack photos are supplied. The archived asset and product/variant records are retained; no replacement packaging is invented. The gallery and old-pack retirement are deployed to the existing Free preview at revision `271767faba35a67dc5c5f5f592a748d0970db049` (Render deploy `dep-dbko9h67bikc73fetgcg`, status `live`). The white-and-blue replacement remains pending. The previously approved Nitro Mass 5 kg upload remains intact.

## Validation

- All 39 automated Node tests passed in the Render build for the retirement revision, covering retired artwork, gallery selection/isolation, source validation, omitted-field preservation, MRP, stock, checkout, accounts and staging. Six focused catalogue tests also passed locally.
- Local Chromium covers real existing pack images and explicitly labelled secondary-view fixtures: thumbnails, full-size original link, zoom/reset, previous/next, arrow keys, Escape, missing secondary views and 320–1440px layout.
- Existing cart, customer registration/login, wholesale application/approval, administrator MRP saves, the exact Nitro bucket and distributor certificate still pass with no page JavaScript errors.
- No payment/courier activation, new hosting resource or main-branch merge.

## Retired Whey artwork check

The six focused catalogue tests pass, including old images in saved product and variant galleries, new front/back gallery fallback, record preservation and unchanged selling prices. Current-pack paths in this test are fixtures only; no white-and-blue photos have been imported. Render confirmed the retirement deployment live and logged successful isolated staging initialization and server startup. A direct hosted-page read remains inaccessible in this execution environment; no fresh hosted visual inspection is claimed. A true 360° rotation needs a complete ordered sequence of original angles; existing gallery navigation does not invent missing sides.
