# Storefront account features

The published Max Volume Nutrition Site is the customer storefront. It uses the existing Node.js/SQLite commerce service through a fixed same-origin Worker gateway; no second commerce database is introduced.

- Authenticated wishlists are isolated by account. Guest wishlists remain on the device and merge after sign-in.
- Reviews require a signed-in customer, one review per product/account, a 1–5 rating and bounded text. New and edited reviews await administrator approval. Public averages/counts include approved reviews only. Public author names use the first name; emails and user IDs are not exposed.
- Existing administrators publish/reject reviews through the administration page. Authorization and audit events are enforced on the server.
- Existing checkout, Razorpay verification, stock reservations, dealer approval and prices are unchanged. Live payments and couriers remain disabled in Free staging.
- The Site gateway forwards only the commerce session cookie, validates the browser Origin before writes, limits bodies and uses a fixed commerce upstream. It does not proxy arbitrary external URLs.
- Browser UI includes product pages, description/specification/review tabs, wishlist, cart, delivery checkout, accounts and order history. Missing product angles are not invented and empty products remain hidden.

Validation: all 43 Node tests and syntax checks pass locally, including account ownership, moderation visibility, edited-review reapproval, unchanged prices/stock and existing commerce/security checks.

The existing Render Free staging service uses disposable test data. It is not durable production customer storage. Business settings, production storage and payment/courier credentials/testing still need completion before accepting live orders.
