# Max Volume Nutrition — Single-Platform Omnichannel Production Blueprint
**Owner-approved direction:** One existing website, one catalogue, one database, one owner dashboard. Serve retail and verified trade customers across Tamil Nadu and Puducherry with a remote-first business model. **No walk-in shop is claimed.**

## What we actually operate
- Existing GitHub: `VMahendar/Max-Volume-Nutrition-` branch `main`
- Existing Render service: `srv-dbk8a33bc2fs73enbmf0` (`max-volume-nutrition-preview.onrender.com`)
- Application: Node.js (`server.mjs`), browser storefront (`public/index.html`), installable PWA (`public/mobile-app.html`), protected owner admin (`public/admin.html`)
- Current storage: SQLite on the paid Render persistent disk, with isolated **staging** data while `npm run start:staging` remains the service start command.
- Planned future architecture (not a present requirement): migrate to Next.js, Expo, PostgreSQL and optional Redis only with proven need, data-migration tests, a rollback plan and owner approval. **Do not replace or split the active website/database just to match an aspirational folder diagram.**

## Logical system
```text
Retail website + installable mobile app + dealer portal + owner dashboard
                             |
                   Same-origin Node.js API
                             |
                    Same product and order data
                             |
           ------------------------------------------------
           |               |                |              |
       Razorpay        Shiprocket      WhatsApp Cloud    Marketing
       one gateway      one courier     consent-based     organic first
       OFF until live   OFF until       OFF until         paid ads OFF
       KYC + tests      pickup + tests  provider setup
```

## Required operating flows
1. **Retail:** products/verified pack images → variants and cart → name and contact → saved lead reference (only when clean production database is active) → payment quote including confirmed freight → Razorpay payment after merchant activation → signed webhook verifies capture → stock committed exactly once → GST invoice only with valid owner-approved GST settings → paid order ready for fulfilment. Until activation, continue the explicit WhatsApp-only manual confirmation flow; do not claim successful payment or a completed order.
2. **Wholesale:** dedicated form with business name, kind, GSTIN if applicable, district/region, phone and requested quantities → owner approval → private prices by role → quote review → payment/credit approval under documented terms → invoice → shipment. Never publish trade prices or supplier costs to anonymous shoppers. De-duplicate WhatsApp leads by reference, and mark the inquiry as contacted/quoted/converted/closed in owner dashboard.
3. **Delivery:** owner verifies actual pickup location (virtual office is not a parcel pickup location), parcel weight/dimensions, serviceable PIN code and live courier quote → customer sees and accepts all charges → only paid/explicitly approved orders are booked through Shiprocket API. Keep keys in Render secrets. Maintain webhook reconciliation, RTO/return and failed-pickup handling.
4. **Retention:** separate affirmative opt-in for WhatsApp/email updates; approved messaging templates, unsubscribe, per-contact throttling, quiet hours, deduplication and spending limits. No mass texting from scraped lists. Abandoned-cart messages only with valid permission and an identifiable saved cart; never claim we can identify anonymous Instagram viewers.
5. **Social:** official, correct Unicorn Pro Series photographs and actual business/creator footage only. Instagram posts, Stories, Reels and district-focused B2B organic outreach. Do not use artificial product packaging, false 5kg/3kg packs, false price claims or invented warehouse/delivery guarantees. Content can be drafted offline. Posting requires a connected Meta account and its permission.
6. **Ads:** once the owner grants a separate budget and Meta/Google account permissions, target local retail enquiry campaigns and separate statewide trade campaigns. Radius settings in a platform are approximate, not an enforceable geofence. Do not assume a 'People living here' selector exists. Pixel/CAPI require applicable consent, browser/server event de-duplication, a verified domain and actual checkout events; **server events must not be used to bypass consent or ad blockers**.

## Launch gates (no shortcuts)
The existing `npm run launch:audit -- --report` evaluates:
- owned HTTPS domain and matching origin, verified persistent database, encrypted offsite backup and tested restore;
- production mode (not staging), merchant-approved Razorpay live keys and webhook plus verified payment/refund test;
- live Shiprocket API user, accepted pickup location, documented courier rate and package test;
- seller GSTIN, registered legal name, actual business address, GST configuration and HSN/rates reviewed with an accountant;
- actual starting stock per variant, verified front/back/ingredients photos (and correct new packaging), valid policies, secure customer recovery.

The owner dashboard now has `/admin.html#launch` backed by owner-only `GET /api/admin/launch-readiness`. This is **read-only**; it does not mark production as approved or enable any provider.

## Single budget policy
Owner stated a **₹2,000–₹3,000** budget target. Before any purchase, confirm whether this is a monthly all-in cap or a one-time amount. Do not create a second Render service, Postgres, Redis, paid hosting plan or new app-store account without explicit confirmation.
- Existing Render Starter: USD $7/month plus existing 1GB persistent disk at USD $0.25/month; currency conversion, taxes and extras depend on invoice.
- Razorpay: no standard setup fee, with transaction charges and GST according to owner's actual merchant quote; a time-limited signup offer may apply but must be verified in the account.
- Shiprocket Lite: ₹0 plan fee but every shipment incurs carrier charges; **API access and serviceability must be verified for the owner's actual plan**.
- Domain registration/renewal, Meta/WhatsApp message charges, paid advertising, payment transaction fees and courier charges are not automatically part of hosting. Google Merchant Center offers eligible free product listings subject to policies and accurate shipping costs.
- Already installable PWA for mobile is the low-cost first stage; native Play Store/Expo is an optional later upgrade with Google developer registration and app compliance.

## Owner onboarding — without sharing secrets in ChatGPT
1. Confirm the **legal seller entity**, GSTIN and actual lawful seller address in the private admin portal; confirm GST rates and invoice prefix with the accountant.
2. In Razorpay's **official dashboard**, complete business KYC and settlement-bank verification, and obtain confirmation that live mode is approved. Do **not** send bank account numbers, account proofs, passwords, live API secrets or tokens in chat or GitHub.
3. In Shiprocket's **official dashboard**, confirm active account/API eligibility, register the real pickup address (not the non-trading virtual office), verify service regions and courier pickup tests. Create a dedicated Shiprocket API user, store secrets only in encrypted Render environment.
4. Verify product count per pack size and current manufacturer photographs; check shipping costs by destination and package before making a paid promise.
5. Buy an owned domain only once; connect DNS/TLS to the current Render service; configure approved origin and Search Console.
6. Run isolated database backup/restore and end-to-end positive, negative and duplicate-webhook tests before changing the staging start command.
7. Confirm any separate paid-ad budget *after* payment, shipping and customer capture are working. Until then use daily organic content and direct opt-in enquiries.

**No 'launch complete' claim may be made merely because code or a checklist exists.** The owner must see verified live payment, billing, courier and recovery outcomes.

## Nearby Delhivery courier workflow (owner requested 7 November 2026)
- The owner has described a nearby NXT/Delhivery courier outlet. **Do not assume its pickup service or exact distance until confirmed.**
- Use the existing Shiprocket integration as the **single** shipping provider; Delhivery is among its courier partners. Avoid separately purchasing/integrating Delhivery One while Shiprocket already handles the route.
- In Owner > Orders, after a paid order exists, verify actual pickup PIN, destination PIN and packed weight; check **live Shiprocket serviceability**. Delhivery is preferred in returned carrier choices, but only appears if available for that route, weight and account. The returned courier ID is selected for AWB, not pre-guessed or hard-coded.
- A serviceability quote is not a booking. The owner must create the shipment, assign AWB, schedule pickup, generate label and manifest, and confirm actual parcel handover. Future auto-booking requires credentials and an agreed pickup procedure, payment capture and reconciliation testing, including failures and RTO.
- Actual pickup address must be a location where parcels are physically packed and handed to the driver. The non-trading virtual office is not eligible as an assumed package pickup point.
- No guaranteed next-day delivery or 5-km local delivery: timing requires official courier eligibility and per-route verification.
