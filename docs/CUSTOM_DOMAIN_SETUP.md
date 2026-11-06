# Max Volume Nutrition — Custom domain handover

## Domain status (2026-11-06)
- Recommended new domain: **maxvolumenutrition.com**.
- `maxvolumenutrition.com`, `maxvolumenutrition.in`, `maxvolumenutrition.store` and `maxvolumenutrition.co.in` reported AVAILABLE when checked via registrar availability lookup on 2026-11-06.
- **Availability does not establish ownership, reservation or exact price. No domain has been purchased.** The business owner must review actual first-year and renewal prices and approve checkout at their chosen registrar; retain account ownership and renewal access.
- No new Render web service. The existing `max-volume-nutrition-preview` Render Starter service continues.

## On purchase, connect to existing Render service
1. Open https://dashboard.render.com/web/srv-dbk8a33bc2fs73enbmf0 → Settings → Custom Domains → Add Custom Domain.
2. Enter the **actual purchased domain** (e.g. `maxvolumenutrition.com`, no scheme). Render adds its corresponding `www` entry/redirect.
3. In the registrar DNS, set:
   - `A` host `@` → `216.24.57.1` (for ordinary DNS providers such as GoDaddy; use Render dashboard's current recommendation if it differs).
   - `CNAME` host `www` → `max-volume-nutrition-preview.onrender.com`.
   - Remove conflicting existing A/CNAME/AAAA records for those hosts. **Do not modify email MX/TXT records.**
4. In Render Custom Domains, Verify and allow the automatic TLS certificate to become issued. Test both root + `www` in a private browser window.
5. Only after verification, set encrypted Render environment `STORE_PUBLIC_URL=https://maxvolumenutrition.com` (or the actual domain). This rewrites the public homepage canonical/OG/JSON-LD and robots/sitemap URLs at response time. Do **not** set until the custom domain works.
6. Review `PUBLIC_ORIGIN` separately before enabling authenticated cross-origin requests from the domain (required for account/dealer forms). The staging startup and payment/shipping settings must stay unchanged until owner-approved production cutover.
7. Once the canonical domain serves successfully, set up a URL-prefix property in Google Search Console, prove ownership, submit `https://maxvolumenutrition.com/sitemap.xml`, request homepage indexing and validate search results over time.
8. Optionally redirect `onrender.com` visitors to the verified canonical domain **only after** account/API origin consistency and domain TLS are tested.

## Search listing and pricing safety
- Google search results are **not guaranteed**, nor instant after sitemap/verification.
- Render Hobby currently includes two custom-domain slots (check the workspace's own billing before adding more).
- Domain registration/renewal is a **separate cost** from Render; never buy extra domains, email subscriptions or other hosting without the owner's approval.
- Continue to keep real payments and shipping disabled. WhatsApp order requests do not capture payment or automatically accept orders.

Sources: https://render.com/docs/custom-domains and https://render.com/docs/configure-other-dns
