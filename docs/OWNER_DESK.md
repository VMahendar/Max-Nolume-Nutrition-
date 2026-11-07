# MVN owner workspace

Open `/admin.html`, sign in through Account with an existing administrator account, then use **Your daily desk**. Customer registrations never grant administrator access.

## Daily work

- **Stock / purchases:** choose a pack, quantity, actual purchase cost, supplier name and bill reference. Preview and confirm only goods physically received. This adds stock and a private purchase record together.
- **Record a sale:** choose a pack, quantity, actual selling price, customer and unique manual order reference. Confirm a completed shop/WhatsApp sale. This deducts unreserved stock and saves an internal record together. It does not verify payment, issue a GST invoice or book shipping. Existing website checkouts belong in Orders to avoid double deduction.
- **Publish an update:** type a headline and customer-facing message; optionally upload a JPG/PNG/WebP photo. Choose launch/stock/deal/news, website/app/both, and start/end dates in India time. Preview, select Publish, and save. Leave Publish off for a private draft.
- **Offers:** configure actual retail discount codes and their terms separately. Publishing an ad alone never changes prices or stock.
- **Customers:** use existing opted-in customer follow-up controls.
- **Dealers / distributors:** review existing business applications and their approval status. Purchase entries also retain the supplier name and bill reference.
- **Products & prices:** existing complete product/pack editor. New product listings and pricing require product setup, separate from launch announcements.

The private ledger shows the latest 100 manual entries; older entries remain in SQLite. A record contains a historical product name, pack and unit amount. It is not a complete accounting, profit calculation, tax or supplier-payables system. Starting physical stock must be counted and confirmed before receiving goods or recording sales. Conflicting stock edits fail; reloading gets the current quantity. Each save has a retry key; repeating the same request cannot apply stock twice. Duplicate product/bill/customer-or-supplier combinations are also rejected. Use Inventory with an explanatory reason to correct stock errors; the original manual record remains as an audit trail.

## Images and schedules

Ad uploads are resized in the browser and encoded as JPEG, then stored in `store_update_images` in the existing durable SQLite database. Database backups include them. Upload public marketing photos only, never invoices or customer data. Maximum stored image size is 1.5 MB. SVG and arbitrary document uploads are rejected. Uploaded photos are publicly readable even before a draft is published; deleting a post does not delete its image. No image recognition, invoice extraction or video ingestion is enabled.

There are at most 40 updates. A revision guard prevents one browser overwriting newer WhatsApp drafts or edits from another browser. Public API: `GET /api/store-updates?surface=web|app`. Drafts, future and expired posts are excluded. Updates appear within a minute in Offers; launch updates also appear in Launches. Both use one backend. Expired cards are removed locally even if a refresh fails. Offers/launches are separate screens in the installed PWA. Schedule ends are exclusive. Private supplier costs and stock records are not exposed by this API.

## WhatsApp owner drafts (prepared, disconnected until configured)

No ChatGPT account linkage is needed to continue asking for changes in the existing Codex conversation. There is no OpenAI API key, AI parser or automatic ChatGPT conversation import in this implementation. A normal WhatsApp phone app, a self-chat or a group does not supply website webhooks.

For official WhatsApp Business Platform intake, configure secrets directly in Render, not in chat, source files or the public admin form:

- `WHATSAPP_UPDATES_ENABLED=true`
- `WHATSAPP_APP_SECRET` — Meta app secret, at least 16 characters
- `WHATSAPP_UPDATES_VERIFY_TOKEN` — independently generated verification secret, at least 32 characters
- `WHATSAPP_PHONE_NUMBER_ID` — the connected business phone-number ID
- `WHATSAPP_UPDATES_OWNER_PHONE` — exact approved sender in international digits, for example 91 plus the owner's Indian mobile number

Register the current HTTPS origin plus `/api/whatsapp/store-updates` as the Meta callback, verify the challenge using that verify token, and subscribe the app to business-account `messages` events. The endpoint must be accessible to Meta; a staging HTTP Basic gate prevents webhook verification. Do not disable authentication on admin routes. Existing public staging browsing still enforces admin sessions.

From the approved personal number, send to the connected business number:

```
MVN UPDATE
New stock has arrived
Your customer-facing announcement text goes here.
```

Only the allowlisted sender and matching business phone-number ID are accepted. POST bodies require the Meta `X-Hub-Signature-256` HMAC signature, checked before parsing. Duplicate message IDs are recorded transactionally and cannot duplicate drafts. Customer text, status events, media and other command formats are ignored. Text becomes an unpublished draft with audience Both. Reload WhatsApp drafts in the admin, choose dates/type, review and publish. No outbound WhatsApp reply, customer broadcast, code execution, stock update or price change is triggered by intake. Provisioning account credentials, subscribing Meta and a real end-to-end owner message test remain required; a configured status alone does not prove delivery works.

When the domain is registered, update Render's custom domain/DNS, the canonical origin and Meta callback before relying on a new hostname. Existing installs may need reinstalling if the app moves to a different origin. No domain has been purchased or attached by this change.
