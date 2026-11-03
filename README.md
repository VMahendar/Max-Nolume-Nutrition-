# MAX VOLUME NUTRITION — SINGLE MASTER WEBSITE

Official source-of-truth repository for the Max Volume Nutrition sports-nutrition storefront.

## One master, one deployment

- **Authoritative source:** `main` branch of this repository.
- **Current free public test deployment:** https://headless-nlozvpbsxpr-mahendar0605-140c.wix-site-host.com
- **Wix site ID (edit this same site; do not create a new one):** `9944f2c5-d6f2-4a2a-909e-1d14f6b9eb8b`
- **Wix dashboard:** https://manage.wix.com/dashboard/9944f2c5-d6f2-4a2a-909e-1d14f6b9eb8b
- **Legacy separate ChatGPT-hosted URL:** https://max-volume-nutrition.wrydegu128.chatgpt.site — not authoritative; it cannot be synchronized automatically with the Wix-hosted site via this repository. Retire or redirect it from its owning editor when available. Do not advertise it.
- **Future custom domain:** Not purchased or connected. Hold until staging is signed off.

**Never treat Codex preview, the legacy ChatGPT-hosted site, and the Wix test site as three independent masters.** Codex changes should be committed to `main` and then deployed to the **existing** Wix site ID above. Changes made in GitHub alone do not auto-publish to Wix.

## Design direction — original MVN, GNC-inspired merchandising

- Professional, high-contrast **GNC-inspired retail layout and shopping usability** — do not copy GNC branding, images, or layouts.
- Unique Max Volume Nutrition **black/gold** brand identity.
- Clean white header with strong search and category navigation; black-and-gold hero; bright off-white shopping grid.
- Real and clearly differentiated product pack photography, bold prices, detailed product pages, responsive mobile browsing.
- Consistent look across homepage, wholesale, about, contact and policies.

## Catalogue — retail only

| Product | Retail price |
|---|---:|
| Potency Whey 5 lbs Chocolate | ₹4,999 |
| Potency Whey 5 lbs Coffee | ₹4,999 |
| Sturdy Pre-Workout 250 g Watermelon | ₹1,399 |
| Nitro Mass 5 kg **bucket** | ₹3,499 |
| Nitro Mass 3 kg **box** | ₹2,599 |
| Pro Creatine 100 g Blueberry | ₹899 |
| Pro Creatine 100 g Cranberry | ₹899 |
| Musclevite Multivitamin | ₹699 |

The 8 products match the launch supplier invoice; variant labels and photos should be checked against the packaging before publicizing them as exact. There must be no public wholesale pricing in HTML or JS. Missing or unverified pack images must not be replaced with a different pack size or fabricated packaging. Product label / lab test reports require verification and should be linked to the correct size and batch.

## Current staging functionality

- Catalogue, filtering, search, variant display, product information, enquiry bag and WhatsApp prefilled enquiries.
- Supplier/reference images and the owner's Nitro Mass 5 kg bucket photograph; product photo requests available.
- Separate business wholesale enquiry page.
- No online payment, no automatic order creation, no customer account, no logistics booking or checkout backend.
- No domain purchase required for preview testing.
- Staging should not be indexed; see `robots.txt`.

## Source files

- `index.html`: storefront structure
- `retail.css`: single authoritative retail design override; avoid additional conflicting styles
- `style.css`: inherited layout rules for all pages
- `app.js`: public retail catalogue and enquiry logic
- `dealer.html`: dealer enquiries only
- `about.html`, `contact.html`, `policies.html`: supporting content

## Publish discipline

1. Make changes to this repository's `main` branch.
2. Test JavaScript syntax, exact prices/SKUs, filters, cart totals and enquiry link generation.
3. Upload changed files to the **same Wix site ID** listed above (use the connected Wix Headless file uploader).
4. Fetch the Wix live paths and hosted product assets to verify HTTP 200 and correct revision.
5. Validate end-to-end on real mobile and desktop browsers before claiming full launch-readiness.
6. Do **not** register a custom domain, enable online payments or shipping, or claim orders are confirmed without separate user approval and implementation.

## Launch blockers

- Verified Nitro Mass **3 kg box** and Musclevite photographs, plus all requested front/back ingredient panels.
- Verify any published lab-test evidence is genuine and relevant to the specific product and batch.
- Manual cross-browser and end-to-end WhatsApp flow confirmation.
- For full e-commerce: transactional backend, order records, payment provider, shipping configuration, tax/legal reviews, and user acceptance testing.
