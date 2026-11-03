import {
  ApiError,
  fail,
  body,
  limitedText,
  text,
  positiveInt,
  digest,
  secureEqual,
  signature,
  sameOrigin,
  admin,
  throttle,
} from "./security.js";
import { address, cart, quote } from "./pricing.js";
import { checkoutReady, razorpay, webhook, finalize } from "./payments.js";
const publicFields = "sku,name,category,price_paise,stock,image_url,verified";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
async function authorizedOrder(request, env, id) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id=?")
    .bind(id)
    .first();
  const token = (request.headers.get("Authorization") || "").replace(
    /^Bearer /,
    "",
  );
  if (!order || !secureEqual(order.access_hash, await digest(token)))
    fail(404, "Order not found.");
  return order;
}
function orderResponse(order, env) {
  return {
    id: order.id,
    status: order.status,
    total_paise: order.total_paise,
    shipping_paise: order.shipping_paise,
    tax_paise: order.tax_paise,
    tax_kind: order.tax_kind,
    provider_order: order.provider_order,
    key_id: env.RAZORPAY_KEY_ID,
    mode: env.PAYMENT_MODE || "test",
  };
}
async function createOrder(request, env, data) {
  checkoutReady(env);
  const key = text(data.request_key, "request key", 80);
  const token = text(data.access_token, "order access token", 128);
  if (
    !/^[A-Za-z0-9_-]{32,128}$/.test(token) ||
    !/^[A-Za-z0-9-]{16,80}$/.test(key)
  )
    fail(400, "Invalid checkout identifiers.");
  const normalized = {
    items: cart(data.items),
    address: address(data.address),
  };
  const fingerprint = await digest(JSON.stringify(normalized));
  const accessHash = await digest(token);
  const existing = await env.DB.prepare(
    "SELECT * FROM orders WHERE request_key=?",
  )
    .bind(key)
    .first();
  if (existing) {
    if (
      existing.fingerprint !== fingerprint ||
      !secureEqual(existing.access_hash, accessHash)
    )
      fail(409, "Checkout request conflicts with an existing order.");
    return json(
      orderResponse(existing, env),
      existing.status === "creating" ? 202 : 200,
    );
  }
  await throttle(request, env, "create-order", 10);
  if (env.TURNSTILE_SECRET) {
    const response = await (env.CHALLENGE_FETCH || fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: text(data.turnstile_token, "bot protection token", 2048),
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      fail(503, "Bot protection is unavailable. No order was created.");
    const result = await response.json();
    if (
      !result.success ||
      result.hostname !== new URL(request.url).hostname ||
      result.action !== "checkout"
    )
      fail(403, "Bot protection verification failed. Refresh the challenge.");
  }
  const priced = await quote(env, normalized);
  const id = crypto.randomUUID();
  const now = Date.now();
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO orders(id,request_key,fingerprint,access_hash,status,total_paise,shipping_paise,tax_paise,tax_kind,address_json,created_at,updated_at) VALUES(?,?,?,?,'creating',?,?,?,?,?,?,?)",
      ).bind(
        id,
        key,
        fingerprint,
        accessHash,
        priced.total_paise,
        priced.shipping_paise,
        priced.tax_paise,
        priced.tax_kind,
        JSON.stringify(priced.address),
        now,
        now,
      ),
      ...priced.items.map((p) =>
        env.DB.prepare(
          "INSERT INTO order_items(order_id,sku,name,quantity,unit_paise,tax_paise) VALUES(?,?,?,?,?,?)",
        ).bind(id, p.sku, p.name, p.quantity, p.unit_paise, p.tax_paise),
      ),
    ]);
  } catch (error) {
    if (/INSUFFICIENT_STOCK/.test(String(error)))
      fail(409, "Stock changed. Refresh the cart and try again.");
    if (/UNIQUE/.test(String(error)))
      fail(
        409,
        "This checkout is already being processed. Retry the same request.",
      );
    throw error;
  }
  let provider;
  try {
    provider = await razorpay(env, "/orders", {
      amount: priced.total_paise,
      currency: "INR",
      receipt: id,
      notes: { mvn_order: id },
    });
  } catch {
    // A timeout can occur after provider creation. Retain the reservation and reconcile; never retry creation blindly.
    return json(
      {
        id,
        status: "creating",
        message:
          "Provider creation is awaiting reconciliation. Keep this order reference; do not submit a second payment.",
      },
      202,
    );
  }
  if (
    !/^order_[A-Za-z0-9]+$/.test(provider.id || "") ||
    provider.amount !== priced.total_paise ||
    provider.currency !== "INR" ||
    provider.receipt !== id
  )
    fail(502, "Provider order requires reconciliation.");
  await env.DB.prepare(
    "UPDATE orders SET provider_order=?,status=CASE WHEN status='creating' THEN 'pending' ELSE status END,updated_at=? WHERE id=? AND provider_order IS NULL",
  )
    .bind(provider.id, Date.now(), id)
    .run();
  const saved = await env.DB.prepare("SELECT * FROM orders WHERE id=?")
    .bind(id)
    .first();
  return json(orderResponse(saved, env), 201);
}
async function adminRoutes(request, env, path) {
  await throttle(request, env, "admin", 50);
  admin(request, env);
  if (request.method === "GET" && path === "/api/admin/orders") {
    const rows = await env.DB.prepare(
      "SELECT id,status,total_paise,provider_order,payment_id,created_at FROM orders ORDER BY created_at DESC LIMIT 100",
    ).all();
    return json({ orders: rows.results });
  }
  const detail = path.match(/^\/api\/admin\/orders\/([A-Za-z0-9-]{36})$/);
  if (request.method === "GET" && detail) {
    const order = await env.DB.prepare(
      "SELECT id,status,address_json,total_paise,provider_order,payment_id FROM orders WHERE id=?",
    )
      .bind(detail[1])
      .first();
    if (!order) fail(404, "Order not found.");
    return json({
      ...order,
      address: JSON.parse(order.address_json),
      address_json: undefined,
      items: (
        await env.DB.prepare(
          "SELECT sku,name,quantity,unit_paise FROM order_items WHERE order_id=?",
        )
          .bind(order.id)
          .all()
      ).results,
    });
  }
  if (request.method === "GET" && path === "/api/admin/products")
    return json({
      products: (
        await env.DB.prepare("SELECT * FROM products ORDER BY sku").all()
      ).results,
    });
  if (request.method === "POST" && path === "/api/admin/products") {
    const d = await body(request);
    const sku = text(d.sku, "SKU", 80);
    const name = text(d.name, "name", 200);
    const category = text(d.category, "category", 50);
    const price = positiveInt(d.price_paise, "price");
    const stock = positiveInt(d.stock, "stock", 100000);
    const verified = positiveInt(d.verified, "verified", 1);
    const published = positiveInt(d.published, "published", 1);
    const tax =
      d.tax_bps === null ? null : positiveInt(d.tax_bps, "tax rate", 10000);
    const hsn = typeof d.hsn === "string" ? d.hsn.trim() : "";
    if (verified && (!/^\d{4,8}$/.test(hsn) || tax === null))
      fail(400, "Verified HSN and tax rate are required.");
    const image = d.image_url || "";
    if (
      typeof image !== "string" ||
      image.length > 1000 ||
      (image && !/^https:\/\//.test(image))
    )
      fail(400, "Use an approved HTTPS image URL.");
    const results = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO products(sku,name,category,price_paise,stock,image_url,published,verified,hsn,tax_bps) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(sku) DO UPDATE SET name=excluded.name,category=excluded.category,price_paise=excluded.price_paise,stock=excluded.stock,image_url=excluded.image_url,published=excluded.published,verified=excluded.verified,hsn=excluded.hsn,tax_bps=excluded.tax_bps WHERE products.stock=?",
      ).bind(
        sku,
        name,
        category,
        price,
        stock,
        image,
        published,
        verified,
        hsn,
        tax,
        positiveInt(d.expected_stock ?? stock, "expected stock", 100000),
      ),
      env.DB.prepare(
        "INSERT INTO audit(action,entity,created_at) VALUES(?,?,?)",
      ).bind("product_update", sku, Date.now()),
    ]);
    if (results[0].meta.changes !== 1)
      fail(
        409,
        "Stock changed during editing. Refresh products before saving.",
      );
    return json({ saved: true });
  }
  if (request.method === "POST" && path === "/api/admin/shipping") {
    const d = await body(request);
    const pin = text(d.pincode, "pincode", 6);
    const state = text(d.state_code, "state", 2);
    if (!/^[1-9]\d{5}$/.test(pin) || !/^\d{2}$/.test(state))
      fail(400, "Invalid shipping location.");
    await env.DB.prepare(
      "INSERT INTO shipping_zones(pincode,state_code,fee_paise,tax_bps,verified) VALUES(?,?,?,?,?) ON CONFLICT(pincode) DO UPDATE SET state_code=excluded.state_code,fee_paise=excluded.fee_paise,tax_bps=excluded.tax_bps,verified=excluded.verified",
    )
      .bind(
        pin,
        state,
        positiveInt(d.fee_paise, "shipping fee"),
        positiveInt(d.tax_bps, "tax rate", 10000),
        positiveInt(d.verified, "verified", 1),
      )
      .run();
    return json({ saved: true });
  }
  if (request.method === "POST" && path === "/api/admin/reconcile") {
    const d = await body(request);
    const id = text(d.id, "order ID", 80);
    const providerId = text(d.provider_order, "provider order", 80);
    if (!/^order_[A-Za-z0-9]+$/.test(providerId))
      fail(400, "Invalid provider order.");
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id=?")
      .bind(id)
      .first();
    if (
      !order ||
      order.provider_order ||
      !["creating", "cancelled", "expired"].includes(order.status)
    )
      fail(409, "Only unresolved provider orders may be linked.");
    const provider = await razorpay(env, `/orders/${providerId}`);
    if (
      provider.receipt !== id ||
      provider.amount !== order.total_paise ||
      provider.currency !== "INR"
    )
      fail(409, "Provider receipt/amount/currency does not match.");
    await env.DB.prepare(
      "UPDATE orders SET provider_order=?,status=CASE WHEN status='creating' THEN 'pending' ELSE status END,updated_at=? WHERE id=? AND provider_order IS NULL",
    )
      .bind(providerId, Date.now(), id)
      .run();
    return json({ linked: true });
  }
  if (request.method === "POST" && path === "/api/admin/verify-payment") {
    const d = await body(request);
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id=?")
      .bind(text(d.id, "order ID", 80))
      .first();
    if (!order || !order.provider_order)
      fail(409, "Link the verified provider order first.");
    return json(
      await finalize(env, order, text(d.payment_id, "payment ID", 80)),
    );
  }
  if (request.method === "POST" && path === "/api/admin/fulfill") {
    const d = await body(request);
    const id = text(d.id, "order ID", 80);
    const result = await env.DB.prepare(
      "UPDATE orders SET status='fulfilled',updated_at=? WHERE id=? AND status='paid'",
    )
      .bind(Date.now(), id)
      .run();
    if (result.meta.changes !== 1)
      fail(409, "Only verified paid orders can be fulfilled.");
    return json({ fulfilled: true });
  }
  fail(404, "Not found.");
}
export default {
  async scheduled(event, env) {
    await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?")
      .bind(Date.now())
      .run();
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith("/api/")) {
      if (path === "/checkout" || path === "/admin") {
        const asset = await env.ASSETS.fetch(request);
        const response = new Response(asset.body, asset);
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("Referrer-Policy", "no-referrer");
        return response;
      }
      return env.ASSETS.fetch(request);
    }
    try {
      if (!env.DB) fail(503, "Commerce database is not configured.");
      if (path === "/api/webhooks/razorpay" && request.method === "POST")
        return json(await webhook(request, env, await limitedText(request)));
      if (request.method === "POST") sameOrigin(request);
      if (path.startsWith("/api/admin/"))
        return await adminRoutes(request, env, path);
      if (path === "/api/config" && request.method === "GET") {
        let ready = false;
        try {
          checkoutReady(env);
          ready = true;
        } catch {}
        return json({
          checkout_enabled: ready,
          payment_mode: env.PAYMENT_MODE || "test",
          turnstile_site_key: env.TURNSTILE_SITE_KEY || "",
        });
      }
      if (path === "/api/products" && request.method === "GET")
        return json({
          products: (
            await env.DB.prepare(
              `SELECT ${publicFields} FROM products WHERE published=1 ORDER BY sku`,
            ).all()
          ).results,
        });
      if (path === "/api/quote" && request.method === "POST") {
        await throttle(request, env, "quote", 60);
        return json(await quote(env, await body(request)));
      }
      if (path === "/api/orders" && request.method === "POST")
        return await createOrder(request, env, await body(request));
      const match = path.match(
        /^\/api\/orders\/([A-Za-z0-9-]{36})(?:\/(verify|cancel))?$/,
      );
      if (match) {
        const order = await authorizedOrder(request, env, match[1]);
        if (request.method === "GET" && !match[2])
          return json({
            ...orderResponse(order, env),
            items: (
              await env.DB.prepare(
                "SELECT sku,name,quantity,unit_paise,tax_paise FROM order_items WHERE order_id=?",
              )
                .bind(order.id)
                .all()
            ).results,
          });
        if (request.method === "POST" && match[2] === "verify") {
          await throttle(request, env, "verify", 30);
          const d = await body(request);
          const payment = text(d.payment_id, "payment ID", 80);
          if (!order.provider_order)
            fail(409, "Provider order is awaiting reconciliation.");
          if (
            !secureEqual(
              await signature(
                env.RAZORPAY_KEY_SECRET,
                `${order.provider_order}|${payment}`,
              ),
              d.signature || "",
            )
          )
            fail(401, "Invalid payment signature.");
          return json(await finalize(env, order, payment));
        }
        if (request.method === "POST" && match[2] === "cancel") {
          if (!["creating", "pending"].includes(order.status))
            fail(409, "Contact support for a cancellation/refund review.");
          await env.DB.prepare(
            "UPDATE orders SET status='cancelled',updated_at=? WHERE id=? AND status IN('creating','pending')",
          )
            .bind(Date.now(), order.id)
            .run();
          const current = await env.DB.prepare(
            "SELECT status FROM orders WHERE id=?",
          )
            .bind(order.id)
            .first();
          if (current.status !== "cancelled")
            fail(
              409,
              "Payment state changed. Refresh before requesting a refund.",
            );
          return json({
            id: order.id,
            status: "cancelled",
            message:
              "If a late payment is captured, it will require manual review/refund. Cancellation does not reverse a captured payment.",
          });
        }
      }
      fail(404, "Not found.");
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.message }, error.status);
      console.error("Commerce request failed", error?.name || "Error");
      return json(
        {
          error:
            "Service unavailable. No payment confirmation has been issued.",
        },
        503,
      );
    }
  },
};
