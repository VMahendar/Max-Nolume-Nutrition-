# Automated WhatsApp customer updates

The SQLite-backed outbox runs with the existing Render store process. A separate Render cron cannot access this disk. It checks every five minutes while the store is running and resumes after restart. Scheduling is bounded to 25 candidates per pass and 9 am–8 pm India Standard Time. No separate paid service was created.

Only customer-selected WhatsApp preferences are used. Email-only subscribers and customers with no consent are not enrolled. Replenishment follows each selected 15/30-day cadence from the latest paid order, manual reminder or consent. Missed intervals produce one current reminder, not a burst. Active retail campaigns automatically become announcement candidates for festival/launch subscribers; approved trade accounts do not receive retail campaign messages. Brand news is scheduled in the administrator announcement editor. Notification dates are not product launch dates.

## Delivery activation

The code is deployed with scheduling PAUSED by default. The current Render storefront uses staging mode, which blocks live delivery even if credentials exist. Do not enable production merely to send marketing; complete the production launch checks first.

Set these values in Render's encrypted Environment settings:
- NODE_ENV=production and STAGING_MODE=false, only after the production cutover.
- MARKETING_AUTOMATION_ENABLED=true.
- MARKETING_PUBLIC_ORIGIN: approved HTTPS store origin, no path.
- MARKETING_LINK_SECRET: random 32+ character secret for signed stop-updates links.
- WHATSAPP_ACCESS_TOKEN: Meta system-user token with WhatsApp messaging permission.
- WHATSAPP_PHONE_NUMBER_ID: the approved sender phone number ID.
- WHATSAPP_GRAPH_VERSION: the supported version selected for the Meta app; no version is guessed in source.
- WHATSAPP_MARKETING_TEMPLATE and WHATSAPP_TEMPLATE_LANGUAGE: the approved marketing template and exact language.

The text-body template must accept four ordered variables: customer name, announcement/reminder text, store destination URL, signed unsubscribe URL. Match the code and approved template before activation. This integration does not send unapproved free-text marketing outside the customer-service window. Review provider billing and sending limits in the connected Meta account.

In Store Administration → Automation, inspect readiness, prepare a queue preview without sending, then enable and save the schedule when ready. Use the draft Glob Tech action to prepare news, review its wording/notification dates, and explicitly enable that announcement. Email automation is not configured.

## Reliability and opt-out

Every event/customer/consent combination has a unique queue key. Consent, recipient phone, topic eligibility, retail/trade status and event expiry are rechecked before sending. At most one accepted or uncertain attempt per customer in 24 hours. Network/5xx/interrupted outcomes are held as unknown; they are not automatically retried. Verify them in Meta before any manual requeue. Provider acceptance is not a delivery/read receipt; no receipt webhook is implemented.

Signed unsubscribe links show a confirmation page, and POST stops all marketing preferences for that specific consent version and cancels its queued messages. Account settings also stop pending delivery. No customer phone numbers, credentials or response bodies are printed in worker logs. Back up the outbox with the existing SQLite backups.

References:
https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text
https://render.com/docs/cronjobs
