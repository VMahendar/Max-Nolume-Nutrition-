# One master branch — Max Volume Nutrition

## What lives in this repository
- **Production candidate and Render preview:** Node.js service in `server.mjs` serving the advanced storefront in `public/`, with SQLite-backed customer/dealer/admin functionality.
- **Retail static pages retained for Wix compatibility:** root `index.html`, `app.js`, `products.js`, `retail.css`, product pages and related HTML/CSS. They are preserved verbatim from the previous `main` branch. These files are **not** automatically served by Render.
- **Tests:** `npm run check && npm test` plus Playwright browser workflow in `.github/workflows/browser-visual-qa.yml`.

## Important deployment policy
1. The Render web service `max-volume-nutrition-preview` still follows `codex/complete-store-review` until its branch is explicitly switched in Render settings.
2. Once the integrated `main` branch is validated, set the existing Render service's branch to `main`, preserve build command `npm run check && env NODE_ENV=test STAGING_MODE=false npm test`, and preserve start command `npm run start:staging`.
3. Keep the staging entry point disabling Razorpay and Shiprocket. Do **not** enable payments or delivery without separate business testing, compliance, and explicit owner approval.
4. The former Wix static site is a separate deployment; a GitHub merge will **not** automatically republish it. Make the Render site the canonical public destination after owner review.
5. `feat/issue-2-commerce` / pull request #3 is intentionally left open. Its older checkout implementation must be evaluated separately, never blindly merged into this Node/SQLite implementation.
6. Product artwork must be the correct pack and variant: Nitro Mass 5 kg uses the approved bucket image; Nitro Mass 3 kg uses an honest placeholder until its box photograph is independently verified.

## Current integration
This consolidation commit preserves *all* Render backend and `public/` files while overlaying the 14 root retail files from the previous `main` branch. It has both branch tips as commit parents, so the preserved static storefront and the Render commerce app share one Git history. Render must not switch branches until the new main is tested.

When updating the public Render store, modify `public/` and backend files; do not assume editing the root Wix snapshots affects Render.
