# Payment and shipping activation — owner onboarding pending

The owner has requested actual payment and shipment activation. Earlier preview-only instructions must not be treated as a permanent refusal to activate them. On 7 November 2026 the owner confirmed that both the Razorpay and Shiprocket accounts still need to be created. Merchant activation and account-specific tests therefore remain unverified.

## Website preparation

The existing retail website and mobile web app now have an optional Razorpay checkout. It is offered only when `/api/retail/catalog` reports `paymentReady: true`. Existing WhatsApp requests remain available. Online payment requires an email, accepted policies, delivery details and explicit review of the server-calculated total. Retail checkout explicitly requests retail pricing even when an approved dealer is signed in. The server still controls prices, inventory, taxes and delivery charge.

The browser retains only the order reference/token and a checkout attempt key plus a hash of the request; delivery details and email are not persisted in the checkout-attempt storage. Payment completion is accepted only after the backend verifies the provider signature and captured payment. Failure preserves the cart. Online offer-code discounts are not supported by this checkout version: offer-code customers are directed to the existing WhatsApp flow rather than silently losing their offer.

Shiprocket already supports administrator-driven prepaid order creation, serviceability, AWB assignment, pickup scheduling, labels, manifests and tracking. Provider-specific tests and real pickup settings are still required. The app does not automatically book shipments on payment or promise COD availability. Delivery totals use the configured store delivery charge, not an automatic customer courier-rate quote.

## Owner actions required

1. Create the Razorpay merchant account directly with the provider and complete its current business/KYC requirements. Supply settlement-bank details only through the provider's secure interface. Keep account numbers, PAN/Aadhaar documents, passwords, API secrets and OTPs out of chat and GitHub.
2. Create the Shiprocket account directly with the provider. Configure the real pickup/return address and contact details, and a dedicated API user. Complete provider-requested KYC/funding in that account when applicable.
3. Confirm legal business name, business and pickup address/PIN, support email, delivery regions and shipping-charge policy. Confirm GST registration status; do not invent a GSTIN or tax classification. Enter verified product stock and package weights/dimensions.
4. In the existing Max Volume Nutrition Render workspace, use service Environment settings for `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` and exact `SHIPROCKET_PICKUP` name. Use test credentials for the first account-specific payment exercise. No secret goes into public JavaScript.
5. Configure Razorpay's webhook at the chosen canonical HTTPS store origin plus `/api/webhook`, with `payment.captured` and `order.paid`, using the matching webhook secret. Confirm capture behaviour in the merchant account.

## Controlled activation

The current `npm run start:staging` entry point unconditionally disables payment/shipping flags and removes provider credentials from its process. Setting flags alone cannot activate it. Retain the existing preview and its data. Prepare a verified production data directory and back it up; do not promote synthetic paid orders or seeded stock into real commerce records.

Before changing the start command or production mode, complete the current launch audit and resolve its actual blockers, including seller settings/policies, verified stock, tax treatment, storage/restore, domain and account-recovery requirements. Do not set verification flags merely to bypass that audit. Any existing owner business records must be reviewed and preserved rather than reset.

Run account-specific successful/failed/cancelled payment and signed webhook checks, then test courier serviceability, duplicate prevention, pickup, labels and tracking with controlled records. Mocked CI tests are not merchant validation. Record the evidence before setting `RAZORPAY_TESTED` or `SHIPROCKET_TESTED`. User authorization to complete integration exists, but credentials, merchant verification and real fulfilment information remain necessary before live collection or booking.
