# Password-protected staging — prepared, not deployed

**Superseded hosting proposal:** The owner now requires zero payment. Use [FREE_PREVIEW.md](FREE_PREVIEW.md) for the current Free-only plan. The paid-instance/disk instructions below are retained for reference and are NOT authorized.

## Hosting availability checked

The existing GitHub repository/PR is accessible. Render and Railway integrations were discovered, but neither is installed/connected. No cloud account credentials, outbound cloud identity or hosting account are configured in this environment. The existing development server is temporary and has no shareable HTTPS URL.

Sites is available but runs server code on Cloudflare Workers; this application uses a Node HTTP server and local `node:sqlite`, so using Sites would require a backend migration. Wix similarly does not provide a direct deployment of this unchanged Node/SQLite service. GitHub Pages runs the static storefront only, not customer/admin APIs. No replacement backend is proposed.

**Recommended:** a separate Render Node web service with one paid instance and one persistent disk. Railway with a volume is an alternative requiring its own connection and configuration. An existing Linux VPS with Docker/Caddy is another option if the owner provides SSH and DNS access. No service or billable resource has been created.

References checked:
- https://render.com/docs/web-services
- https://render.com/docs/disks
- https://render.com/docs/node-version
- https://render.com/docs/environment-variables
- https://render.com/docs/deploys
- https://docs.railway.com/volumes

## What is ready

- Existing PR #1 storefront and all customer, dealer and administrator features; original approved gold logo bytes unchanged.
- `staging-server.mjs`: dedicated entry point that forces all payment/shipping enablement and approval flags false and removes provider credentials from that process.
- `staging.mjs`: site-wide HTTP Basic Authentication before static files and APIs; requires a valid scrypt password hash and an isolated test-data marker; failed-attempt limiting; no-index and no-store response headers. `/healthz` alone exposes the minimal health result without credentials.
- `deploy/staging-init.mjs`: initializes a new separate database with two test accounts, synthetic stock, a pending dealer application and one clearly identified demo order. It refuses an existing unmarked database and retains existing marked staging data on restart. Existing approved retail prices and product assets remain unchanged. Business prices remain unset until edited as test data by the staging administrator.
- A visible staging/test-data banner. No actual payment or courier booking is possible through the staging entry point.
- Staging access credentials and app account credentials are separate. The outer password grants access to the preview; customer/admin privileges still require the appropriate app login.

An HTTPS staging endpoint is internet-reachable so mobile Chrome and a laptop can open it; all website content and APIs require the staging password. This is password-restricted access, not a private-network/VPN-only service. `noindex` supplements authentication and is not the access control.

## Required account and permissions

1. A Render account/workspace with billing enabled for a paid web service and persistent disk. The owner must approve the selected plan and its displayed recurring cost before creation.
2. Install/connect Render in this session if the assistant should manage the deployment; authorize the intended workspace. Alternatively the owner can follow these dashboard steps themselves after approving deployment.
3. GitHub source-read access to `VMahendar/Max-Volume-Nutrition-`, branch `codex/complete-store-review`, restricted to this repository where supported. No permission to merge main or write production data is needed for deployment.
4. Permission to create only the staging service/disk, enter staging secrets, manually deploy the reviewed commit and inspect staging logs. Do not grant access to a production database or provider live credentials.
5. Three different strong staging secrets: outer site-access password, staging administrator password, staging customer password. Enter secrets through Render's environment settings; do not put them in chat, GitHub, screenshots or a URL.
6. No custom domain is required for the initial provider-generated HTTPS URL. A custom staging subdomain would additionally require owner-approved DNS access and an exact `PUBLIC_ORIGIN` setting.

## Exact Render deployment procedure — perform only after owner approval

**Approval boundary:** Creating a Render service can start its initial deployment. Do not click Create Web Service, apply a Blueprint, provision a paid disk, or trigger deployment before the owner approves this concrete plan. Disable automatic deploys so future branch pushes do not publish without review.

1. Select the approved Render workspace and approved paid plan. Choose **New → Web Service** and the existing GitHub repository (do not fork or create a replacement project).
2. Enter these settings before the initial creation/deployment:

   | Setting | Exact value |
   |---|---|
   | Repository | `VMahendar/Max-Volume-Nutrition-` |
   | Branch | `codex/complete-store-review` |
   | Runtime / language | Node |
   | Root directory | Repository root (leave blank) |
   | Build command | `npm run check && env NODE_ENV=test STAGING_MODE=false npm test` |
   | Start command | `npm run start:staging` |
   | Health check path | `/healthz` |
   | Instance count | 1, no horizontal autoscaling |
   | Auto-deploy | Off / manual only |
   | Persistent disk | New staging-only disk, initially 1 GB, mount path `/var/data` |

   Native Node avoids container volume-ownership differences. The start command initializes data **at runtime**, when the disk is mounted; do not initialize SQLite in the build command. Only `/var/data` is persistent. Use a new disk, never a copy of production.

3. Set environment values from `deploy/staging.env.example`. In particular:

   ```text
   NODE_ENV=production
   NODE_VERSION=24.19.0
   HOST=0.0.0.0
   STAGING_MODE=true
   DATA_DIR=/var/data/mvn-staging
   STAGING_USERNAME=reviewer
   STAGING_PASSWORD_HASH=<private generated hash>
   STAGING_ADMIN_PASSWORD=<different strong password, at least 16 characters>
   STAGING_CUSTOMER_PASSWORD=<another strong password, at least 16 characters>
   PAYMENTS_ENABLED=false
   PAYMENT_MODE=test
   RAZORPAY_TESTED=false
   LIVE_PAYMENTS_APPROVED=false
   POLICIES_APPROVED=false
   SHIPROCKET_ENABLED=false
   SHIPROCKET_TESTED=false
   TRUST_PROXY=false
   ```

   Leave Razorpay and Shiprocket keys/passwords entirely absent. Let Render supply its `PORT`. Leave `PUBLIC_ORIGIN` absent for the generated URL: the staging entry point uses Render's documented `RENDER_EXTERNAL_URL`. On a custom domain set `PUBLIC_ORIGIN` to its exact HTTPS origin and use that origin for all browser activity.

4. Generate the **outer site-access password hash** locally without exposing the password in shell history or process arguments. In Bash, from the repository root:

   ```bash
   read -r -s -p 'Choose staging access password (16+ characters): ' mvn_staging_password
   printf '\n'
   printf '%s' "$mvn_staging_password" | node deploy/hash-staging-password.mjs
   unset mvn_staging_password
   ```

   Copy only the resulting hash to `STAGING_PASSWORD_HASH` in Render. Store the corresponding password in your password manager and share it with intended reviewers privately. Use different passwords for the two app accounts.

5. Review the branch commit SHA and settings once more. After owner approval, create/deploy the staging service with authentication secrets present from its **first start**. If required secrets or the test-data directory are invalid, the process refuses to start; it does not fall back to anonymous access. Confirm Auto-deploy is Off immediately and use manual, specific-commit deploys for subsequent updates.
6. Wait for the health check to pass. Copy the **actual URL returned by Render**; its final hostname depends on availability and is not known before service creation. Verify the TLS certificate in Chrome without bypassing browser warnings.
7. In an incognito browser, open the real URL. It must prompt for the outer `reviewer` username and chosen staging password before showing the homepage or logo. Check direct `/admin.html`, `/account.html`, `/max-volume-logo.png` and `/api/catalog` requests without credentials; each must return 401. Only `/healthz` can return its minimal 200 result unauthenticated.
8. After the outer password, use these app accounts:

   | Role | Email | Password |
   |---|---|---|
   | Administrator | `staging-admin@example.test` | The privately configured `STAGING_ADMIN_PASSWORD` |
   | Customer / pending wholesale applicant | `staging-customer@example.test` | The privately configured `STAGING_CUSTOMER_PASSWORD` |

   Admin URL: `/admin.html`; customer login/dealer application: `/account.html`; product example: `/#product/nitro-mass`; cart: Bag on the storefront. Never reuse the previous local preview demo password for hosted staging.
9. Inspect homepage/logo/product/cart on mobile Chrome and laptop. Sign in as customer to view the synthetic demo order and pending dealer application. Sign in separately as administrator to review/approve the test dealer, edit test prices/stock and inspect fulfilment. Use fake details only. The staging banner must remain visible; payments and Shiprocket must both show disabled, and checkout must refuse payment.
10. Restart once and verify the test accounts and records survive. Record the reviewed commit, successful access checks, real HTTPS URL and reset/backup procedure. The prepared online SQLite backup utility can back up staging to private storage. Rotating app-account passwords after first seed uses the app password-change flow; changing seed environment secrets does not overwrite existing password hashes.

## Reset, updates and separation

Never import production data into this database. Update staging only by an owner-approved manual deploy of the PR branch commit; do not merge main or enable auto-deploy. The initializer is idempotent and does not reset existing staging data on each restart. For a fresh reset, stop staging and attach a **new, empty staging-only disk** or use a new empty staging data directory, then initialize it. Retire old staging data only with explicit owner authorization.

The site-wide password hash can be rotated in the hosting secret settings followed by a manual restart/redeploy. Old browser credentials will then receive a new authentication challenge. The application customer/admin passwords remain independent.

No real HTTPS URL has been provisioned or claimed yet. Account connection, paid-resource approval and approval to deploy this password-protected staging service are the outstanding steps.
