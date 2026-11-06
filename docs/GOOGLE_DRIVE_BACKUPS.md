# Max Volume Nutrition — encrypted Google Drive offsite backups

## Verified destination
Private Drive folder: https://drive.google.com/drive/folders/1IV2j-JGJzIF9PY5l7LUc_jXzrv8SIbXZ
Folder ID: 1IV2j-JGJzIF9PY5l7LUc_jXzrv8SIbXZ

## Architecture
- The existing single-instance Render service uses persistent SQLite under DATA_DIR=/var/data/mvn-staging.
- Node's SQLite backup API makes a transactionally consistent SQLite snapshot. PRAGMA integrity_check runs before encryption.
- Encrypt with AES-256-GCM using a separate 32-byte private encryption key held ONLY in Render and a secured offline recovery record.
- Send only ciphertext through HTTPS to an owner-controlled Google Apps Script Web App.
- A second 32-byte independent key signs uploads with HMAC-SHA256. Invalid requests and expired timestamps are rejected before touching Google Drive.
- Google Apps Script creates an encrypted file in the dedicated private Drive folder and automatically trashes matching backup files older than 30 days upon a successful new upload.
- Daily attempt runs from the *existing service* after 20:30 UTC (2:00 a.m. IST the following day). Server restarts can cause catch-up attempts. No separate Render cron job, paid database or new hosting service is required.
- The backup scheduler remains entirely inactive unless ALL three environment variables below are configured. The existing staged website, payment and shipping settings are unchanged.

## One-time Google account authorization (owner required)
A Google Drive connection in ChatGPT does **not** grant unattended access to Render. The Google account owner must explicitly authorize a web app once.

1. Open https://script.google.com/ with the Google account that owns the private Drive folder.
2. Create a new Google Apps Script project named \`MVN Encrypted Drive Backup Receiver\`.
3. Replace its \`Code.gs\` with the exact code in \`deploy/google-drive-receiver.gs\` from this repository.
4. In **Project Settings → Script Properties**, create:
   - \`MVN_FOLDER_ID\` = \`1IV2j-JGJzIF9PY5l7LUc_jXzrv8SIbXZ\`
   - \`MVN_AUTH_KEY_B64\` = a newly generated private base64 32-byte authentication key (must also be stored as \`MVN_BACKUP_AUTH_KEY_B64\` in Render)
5. Deploy → New deployment → Web app → Execute as **Me** → Who has access **Anyone**. Authorize the script's requested Drive access under the correct account. The endpoint is publicly callable but requires HMAC authorization and never accepts plaintext files. If an organization prohibits public web apps, don't weaken its controls; choose another supported backup destination.
6. Copy the resulting HTTPS web app URL ending in \`/exec\` to Render's \`MVN_BACKUP_ENDPOINT\`. Do not place API keys, backup keys or secrets in GitHub or ChatGPT.

## Private key generation
On a trusted device with Node.js, run this command twice to generate **two different** independent keys:
\`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"\`

The first key is \`MVN_BACKUP_ENCRYPTION_KEY_B64\`. Store it in Render and in a safe **offline password manager/recovery record**; losing this key makes backups unrecoverable. The second is \`MVN_BACKUP_AUTH_KEY_B64\` for Render and the Google Apps Script property. Never send either key in messages or commit them. Set \`MVN_BACKUP_ENDPOINT\` in Render with the exact owner-authorized Apps Script \`/exec\` URL. This is a merge update; leave all other Render environment variables unchanged.

## Verification and restore
- After setting all three Render variables, the app will attempt one offsite backup after the daily time threshold. Review Render logs for \`Encrypted Google Drive backup confirmed: mvn-YYYY-MM-DD.sqlite.enc\`.
- Verify a matching encrypted file exists in the private Drive folder. Do not mistake a local SQLite backup or simulated test for an offsite backup.
- Download an encrypted backup onto a trusted machine; keep the encryption key private. Run:
  \`MVN_BACKUP_ENCRYPTION_KEY_B64=... node deploy/restore-drive-backup.mjs /secure/download/mvn-DATE.sqlite.enc /secure/isolated/restore-test.sqlite\`
  The destination MUST NOT exist. The script decrypts into a fresh file and verifies \`PRAGMA integrity_check\`. Do not paste secrets into shell history; inject the env var securely instead.
- Open the isolated SQLite file and verify representative account, dealer, inventory and order rows before declaring disaster recovery ready. Never restore directly over the running database.
- A Google Apps Script endpoint or Google account quota can block uploads. Check logs and Drive contents periodically; the scheduler retries after failures. 30-day retention is best-effort at the next successful upload, not a hard guarantee.
- The Apps Script body size guard makes this simple transport unsuitable once a snapshot exceeds ~6 MB. If it grows, replace the transport rather than silently losing backups.

## Cost and launch status
The destination uses the owner's existing Google Drive storage allowance. No new paid service is activated by committing this code. Google storage quota and Apps Script quotas still apply.
**Do not report scheduled backups as active or production recovery as verified until the Google web app is deployed, private Render variables are installed, an actual upload is observed, and a downloaded snapshot is restored successfully.**
