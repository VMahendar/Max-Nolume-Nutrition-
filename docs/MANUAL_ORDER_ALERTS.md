# Manual orders and owner notifications — safe staging plan

Owner notification targets: +91 77088 30513 (WhatsApp) and mahendar0605@gmail.com (email).

## Current status
- `order-notifications.mjs` is an isolated, **not yet wired** provider adapter. It never sends anything until the application explicitly calls `notifyOrder` with `ORDER_ALERTS_ENABLED=true`.
- There is **no live manual-order endpoint** in this branch. Existing `/api/checkout` remains blocked with payment integration off. No customer should be told that an order has been accepted.
- There is **no durable database** on the current Render Free preview. Never connect a live order-creation action to its ephemeral SQLite file.
- Product, stock, retail/gym/wholesale prices and dealer approval already exist in `/admin.html` and the admin API. Photo paths and variants are edited as JSON, so mobile-friendly editing remains a UX improvement.
- Do not enable Razorpay or Shiprocket or change `staging-server.mjs`.

## Required before manual order placement
1. Provision **durable** database/storage with owner-approved costs and encrypted offsite backup + restore testing. Render Free ephemeral disk is NOT acceptable. Render Free Postgres expires, so is not a long-term order database.
2. Add `POST /api/manual-orders` with strong validation, limits, server-side catalog price lookup, idempotency key, authoritative inventory reservation, terms consent, database transaction, and status `awaiting_manual_confirmation`. Do not mark any order paid.
3. Build accessible cart form and receipt that clearly say 'Order request only, no payment collected, no delivery booked'. Require affirmative owner confirmation; never silently convert to paid orders.
4. Add an outbox table and background-safe retry of notifications on committed orders, with unique (order ID, channel, event) key and attempt counters. Provider API failure must not lose an order or produce duplicate notifications.
5. Add admin-only approve/reject actions with audit trail and correct stock reservation release on rejection. Keep existing wholesale/gym authorization rules.
6. Enable Resend with verified sender domain and Meta WhatsApp Cloud API with approved `mvn_new_order` template containing two body parameters: order ID, total. Configure exact provider credentials privately in Render:
   - `ORDER_ALERTS_ENABLED=false` until approved tests;
   - `ORDER_ALERT_EMAIL=mahendar0605@gmail.com`;
   - `ORDER_ALERT_WHATSAPP=917708830513`;
   - `RESEND_API_KEY`, `ORDER_ALERT_SENDER`;
   - `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, optional `WHATSAPP_TEMPLATE_LANGUAGE=en`.
7. Test duplicate submissions, auth, stock consistency, invalid pricing/tier access, persistence after restart/redeploy, provider failure and retry, non-delivery of real alerts in staging, and mobile admin workflow.

## Hard launch guards
`PAYMENTS_ENABLED=false`, `SHIPROCKET_ENABLED=false`, `STAGING_MODE=true` on preview. No real customer ordering, shipping or payment until explicit authorization following durable-storage and operational tests.

References:
- https://render.com/docs/free
- https://render.com/docs/disks
- https://resend.com/docs/api-reference/emails/send-email
- https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text
