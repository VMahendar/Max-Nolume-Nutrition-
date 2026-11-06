# Max Volume Nutrition — SQLite recovery backups

## Verified existing infrastructure (7 Nov 2026)
- Service: `max-volume-nutrition-preview`, workspace `Max Volume Nutrition`, branch `main`.
- Render persistent 1 GB disk mounted at `/var/data`.
- Staging database uses the existing `DATA_DIR` configuration (original intended value `/var/data/mvn-staging`).
- **Never replace DATA_DIR or move/copy production data casually.** Changing it can silently initialize another empty database.
- Staging process disables Razorpay and Shiprocket even if their flags are accidentally set.

## Automatic local snapshots
Deploy the code and use Render's Environment tab to verify that `DATA_DIR` points to the EXISTING data directory inside `/var/data`. Only then set `BACKUP_LOCAL_ENABLED=true`.

The running Node process will make a SQLite online backup after approximately one minute and check daily afterward. Each backup is copied into an isolated scratch restore file and tested with `PRAGMA integrity_check` and expected store-table queries. Only verified snapshots are published as:
```
$DATA_DIR/backups/orders-YYYYMMDDTHHMMSSZ-xxxxxxxx.sqlite
```
Retain the newest three local snapshots. The scheduler skips if a verified snapshot was created within the last 23 hours. It checks free space and cannot erase the active database. Snapshot/restore scratch files are owner-only and are never served by the public website.

If backups fail, log messages start with `SQLite backup failed:`. If successful, log messages start with `SQLite backup: verified isolated restore` or `SQLite backup: recent verified copy retained`. Logs do not print customer information.

## Isolated recovery test (never overwrite live data)
- On the Render Shell, inspect `$DATA_DIR/backups/` privately; confirm there is a verified snapshot.
- Transfer an encrypted copy of the snapshot to a separate trusted machine or private storage using a supported secure transfer. Never send it to GitHub, a public URL or unsecured email.
- Restore the copied snapshot into a fresh, separate test directory, never into the active `$DATA_DIR`.
- Run `PRAGMA integrity_check` and test that expected product, settings, user and order records are present. Do not sign into test accounts with real customer data on an untrusted host.
- A production disaster restore requires a maintenance window, an independently verified point-in-time backup, and an explicit operator decision; do not replace the live `orders.sqlite` while the server is running.

## Limitations — not yet full disaster recovery
- Local backups are **on the same Render disk** as the active SQLite database. Disk loss or account compromise can destroy both.
- Render automatically snapshots persistent disks roughly every 24 hours, with a limited retention period; disk snapshots are not equivalent to safe application-native database backups.
- **Encrypted automated offsite export is still NOT configured.** It requires a separately secured destination (e.g. S3-compatible private bucket), upload credentials held only in Render environment secrets, object retention rules and a real restore drill.
- Do not set `OFFSITE_BACKUP_CONFIGURED` or `BACKUP_RESTORE_TESTED` to `true` until an offsite copy has actually been uploaded and independently restored.
- Staging seed accounts and demo orders are test data, not production records.
- Keep `PAYMENTS_ENABLED=false` and `SHIPROCKET_ENABLED=false`; this backup change does not authorize activating them.

## Source/test
- `deploy/local-backups.mjs`: verified on-disk scheduler, isolated restore and three-copy retention.
- `tests/local-backups.test.mjs`: simulated data-change and restore/retention tests.
- `npm run check && npm test`: validates source and existing commerce tests.
