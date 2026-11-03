import { ApiError, fail, secureEqual, signature } from "./security.js";
export function checkoutReady(env) {
  if (env.CHECKOUT_ENABLED !== "true" || env.LEGAL_APPROVED !== "true")
    fail(
      503,
      "Online checkout is awaiting owner configuration and approval. WhatsApp enquiries remain available.",
    );
  if (
    !env.RAZORPAY_KEY_ID ||
    !env.RAZORPAY_KEY_SECRET ||
    !env.RAZORPAY_WEBHOOK_SECRET
  )
    fail(503, "Payment service is not configured.");
  const mode = env.PAYMENT_MODE || "test";
  if (mode === "test" && !env.RAZORPAY_KEY_ID.startsWith("rzp_test_"))
    fail(503, "Test-mode key mismatch.");
  if (
    mode === "live" &&
    (env.LIVE_PAYMENTS_APPROVED !== "true" ||
      !env.RAZORPAY_KEY_ID.startsWith("rzp_live_"))
  )
    fail(503, "Live payments have not been approved.");
  if (mode === "live" && (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY))
    fail(503, "Live checkout bot protection is not configured.");
  if (!["test", "live"].includes(mode)) fail(503, "Invalid payment mode.");
}
export async function razorpay(env, path, payload) {
  const response = await (env.PROVIDER_FETCH || fetch)(
    `https://api.razorpay.com/v1${path}`,
    {
      method: payload ? "POST" : "GET",
      headers: {
        Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (!response.ok)
    throw new ApiError(
      502,
      "Payment provider is unavailable. Your payment has not been confirmed.",
    );
  const data = await response.json();
  if (!data || typeof data !== "object")
    fail(502, "Invalid provider response.");
  return data;
}
export async function finalize(env, order, paymentId) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) fail(400, "Invalid payment ID.");
  const payment = await razorpay(env, `/payments/${paymentId}`);
  if (
    payment.order_id !== order.provider_order ||
    payment.amount !== order.total_paise ||
    payment.currency !== "INR" ||
    payment.status !== "captured"
  )
    fail(409, "The provider has not confirmed a matching captured payment.");
  if (order.payment_id && order.payment_id !== paymentId) {
    await env.DB.prepare(
      "INSERT INTO audit(action,entity,created_at) VALUES(?,?,?)",
    )
      .bind("duplicate_capture_review", `${order.id}:${paymentId}`, Date.now())
      .run();
    fail(409, "An additional payment needs administrator review.");
  }
  if (
    order.payment_id === paymentId &&
    ["paid", "paid_review", "fulfilled", "refunded"].includes(order.status)
  )
    return { id: order.id, status: order.status };
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO payment_events(event_key,order_id,payment_id,created_at) VALUES(?,?,?,?)",
    ).bind(`captured:${paymentId}`, order.id, paymentId, now),
    env.DB.prepare(
      "UPDATE orders SET status=CASE WHEN status IN('creating','pending') THEN 'paid' WHEN status IN('cancelled','expired') THEN 'paid_review' ELSE status END,payment_id=COALESCE(payment_id,?),updated_at=? WHERE id=? AND (payment_id IS NULL OR payment_id=?)",
    ).bind(paymentId, now, order.id, paymentId),
  ]);
  const saved = await env.DB.prepare(
    "SELECT id,status,payment_id FROM orders WHERE id=?",
  )
    .bind(order.id)
    .first();
  if (saved.payment_id !== paymentId)
    fail(409, "Payment reconciliation requires administrator review.");
  return { id: saved.id, status: saved.status };
}
export async function webhook(request, env, raw) {
  if (
    !env.RAZORPAY_WEBHOOK_SECRET ||
    !env.RAZORPAY_KEY_ID ||
    !env.RAZORPAY_KEY_SECRET
  )
    fail(503, "Webhook is not configured.");
  const expected = await signature(env.RAZORPAY_WEBHOOK_SECRET, raw);
  if (!secureEqual(expected, request.headers.get("X-Razorpay-Signature") || ""))
    fail(401, "Invalid webhook signature.");
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    fail(400, "Invalid webhook payload.");
  }
  if (event.event !== "payment.captured")
    return { received: true, ignored: true };
  const payment = event.payload?.payment?.entity;
  if (!payment || typeof payment.order_id !== "string")
    fail(400, "Missing payment entity.");
  const order = await env.DB.prepare(
    "SELECT * FROM orders WHERE provider_order=?",
  )
    .bind(payment.order_id)
    .first();
  if (!order) fail(409, "Order mapping is awaiting reconciliation.");
  return finalize(env, order, payment.id);
}
