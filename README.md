# Max Volume Nutrition

Existing navy storefront, retail price catalogue and WhatsApp quote bag, plus an incremental WooCommerce integration for Issue #2. Branding and existing product imagery remain intact; unverified stock/images are not substituted.

```sh
npm run check
python3 -m http.server 8080
```

`npm run build` produces `dist/site` for the existing GitHub Pages website and `dist/max-volume-commerce` for WordPress installation. There are no JavaScript runtime dependencies. PHP 8.2+ and WordPress/WooCommerce hosting are needed for commerce; Pages alone cannot run checkout.

- [Architecture and implemented boundaries](docs/ARCHITECTURE.md)
- [Staging, deployment, DNS/TLS and rollback](docs/DEPLOYMENT.md)
- [Actual tests and required acceptance matrix](docs/TESTING.md)
- [Missing credentials, assets, approvals and launch gates](docs/LAUNCH-CHECKLIST.md)
- [Issue coverage and remaining development](docs/ISSUE-2-STATUS.md)

Checkout is disabled by default. This is a reviewable implementation increment, **not a completed or production-certified implementation of every Issue #2 requirement**. Provider integrations, native Woo acceptance, accounting and full end-to-end acceptance remain open. No secrets are included, no payment success is simulated, and no real provider calls or production deployment are claimed.
