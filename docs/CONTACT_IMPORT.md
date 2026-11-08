# Consented WhatsApp contacts: safe CSV staging

This is a private, opt-in contact **staging** tool. It does not send messages, bypass Meta approval, create new users, or enable the existing WhatsApp scheduler. Importing a Google Contacts CSV alone must never grant marketing consent. An operator must verify the recipients' actual consent and record its source and confirmation time.

## Workflow

1. Keep the exported Google Contacts CSV **outside GitHub** and outside publicly served Render directories.
2. Preview locally on Node.js 24+: 
   `node import-marketing-contacts.mjs --csv /private/contacts.csv --consent-source "Verified opt-in records from business customers" --confirmed-at 2026-11-08T03:00:00Z`
3. Review the aggregate counts (invalid numbers and duplicates are excluded). Never print recipients to CI logs.
4. **Only after confirming the target is the correct private durable data directory**, add `--commit --data-dir /private/mvn-data`. Back up its SQLite database first. Imported recipients go into `imported_marketing_contacts`; account logins and existing `marketing_preferences` remain unchanged.
5. Record opt-outs before any additional import and before any send. Opted-out rows cannot be automatically reactivated by an import.
6. The imported staging table is intentionally **not wired to a delivery worker**. Do not start live broadcasts until a sender, provider template, opt-out processing and consent validation have been integrated and tested.

## Existing provider integration blockers

The existing `marketing-automation.mjs` scheduler is restricted to 09:00–20:00 Asia/Kolkata, selects only consenting registered users, and is disabled on Render staging. A one-time late-evening launch campaign requires a separate, reviewed delivery policy and recipient selection path rather than weakening the existing safeguards. Meta Cloud API requires a verified phone-number ID, server-side token, approved marketing template, and billing/limits verification.

Current live Render service is kept on `npm run start:staging`. Do not switch to production or enable `MARKETING_AUTOMATION_ENABLED` simply to send marketing. There is no automatic WhatsApp broadcast or SMS path in this change.
