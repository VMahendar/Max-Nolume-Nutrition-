import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../worker/index.js";
import { signature } from "../worker/security.js";
class D1 {
  constructor() {
    this.db = new DatabaseSync(":memory:");
    for (const file of ["0001-commerce.sql", "0002-catalogue.sql"])
      this.db.exec(readFileSync(`worker/migrations/${file}`, "utf8"));
  }
  prepare(sql) {
    const db = this.db;
    let args = [];
    const statement = {
      bind(...values) {
        args = values;
        return statement;
      },
      async first() {
        return db.prepare(sql).get(...args) || null;
      },
      async all() {
        return { results: db.prepare(sql).all(...args) };
      },
      async run() {
        const r = db.prepare(sql).run(...args);
        return { meta: { changes: Number(r.changes) } };
      },
    };
    return statement;
  }
  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const r = [];
      for (const s of statements) r.push(await s.run());
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
}
function setup() {
  const env = {
    DB: new D1(),
    CHECKOUT_ENABLED: "true",
    LEGAL_APPROVED: "true",
    PAYMENT_MODE: "test",
    RAZORPAY_KEY_ID: "rzp_test_fixture",
    RAZORPAY_KEY_SECRET: "fixture-key",
    RAZORPAY_WEBHOOK_SECRET: "fixture-hook",
    ADMIN_TOKEN: "a".repeat(64),
    ORIGIN_STATE: "33",
  };
  const calls = [];
  const remote = new Map();
  let serial = 0;
  env.PROVIDER_FETCH = async (url, options) => {
    calls.push({ url, method: options.method });
    if (options.method === "POST") {
      const data = JSON.parse(options.body);
      const id = `order_fixture${++serial}`;
      remote.set(id, data);
      return Response.json({ id, ...data });
    }
    if (url.includes("/payments/")) {
      const id = url.split("/").at(-1);
      const [order_id, data] = [...remote].at(-1);
      return Response.json({
        id,
        order_id,
        amount: data.amount,
        currency: "INR",
        status: "captured",
      });
    }
    const id = url.split("/").at(-1);
    return Response.json({ id, ...remote.get(id) });
  };
  env.DB.db.exec(
    "UPDATE products SET verified=1,stock=3,hsn='9999',tax_bps=1800;INSERT INTO shipping_zones VALUES('600001','33',0,0,1)",
  );
  return { env, calls, remote };
}
const fixture = () => ({
  request_key: crypto.randomUUID(),
  access_token: "x".repeat(64),
  items: [{ sku: "MVN-MULTI", quantity: 1 }],
  address: {
    name: "Test Customer",
    phone: "9876543210",
    email: "fixture@example.invalid",
    line1: "Test fixture address",
    city: "Chennai",
    state_code: "33",
    pincode: "600001",
  },
});
async function call(env, path, method = "GET", data, headers = {}) {
  const request = new Request(`https://store.example${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://store.example",
      ...headers,
    },
    body:
      data === undefined
        ? undefined
        : typeof data === "string"
          ? data
          : JSON.stringify(data),
  });
  const response = await worker.fetch(request, env);
  return { status: response.status, data: await response.json() };
}
test("free backend publishes only public products, never private price metadata", async () => {
  const { env } = setup();
  env.DB.db.exec(
    "INSERT INTO private_prices VALUES('MVN-MULTI','dealer',12300,6)",
  );
  const r = await call(env, "/api/products");
  assert.equal(r.status, 200);
  assert.equal(r.data.products.length, 8);
  assert.doesNotMatch(
    JSON.stringify(r.data),
    /12300|dealer|private_prices|hsn|tax_bps/,
  );
});
test("disabled checkout, unapproved live keys and cross-origin posts fail closed", async () => {
  const { env, calls } = setup();
  env.CHECKOUT_ENABLED = "false";
  assert.equal((await call(env, "/api/orders", "POST", fixture())).status, 503);
  env.CHECKOUT_ENABLED = "true";
  env.PAYMENT_MODE = "live";
  assert.equal((await call(env, "/api/orders", "POST", fixture())).status, 503);
  env.PAYMENT_MODE = "test";
  assert.equal(
    (
      await call(env, "/api/orders", "POST", fixture(), {
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
  assert.equal(calls.length, 0);
});
test("real database recalculates prices, reserves stock and deduplicates checkout", async () => {
  const { env, calls } = setup();
  const input = { ...fixture(), total_paise: 1, price_paise: 1 };
  const first = await call(env, "/api/orders", "POST", input);
  assert.equal(first.status, 201);
  assert.equal(first.data.total_paise, 69900);
  assert.equal(
    env.DB.db.prepare("SELECT stock FROM products WHERE sku='MVN-MULTI'").get()
      .stock,
    2,
  );
  const again = await call(env, "/api/orders", "POST", input);
  assert.equal(again.data.id, first.data.id);
  assert.equal(calls.length, 1);
  input.items[0].quantity = 2;
  assert.equal((await call(env, "/api/orders", "POST", input)).status, 409);
});
test("order ownership and administrator endpoints require secrets", async () => {
  const { env } = setup();
  const input = fixture();
  const first = await call(env, "/api/orders", "POST", input);
  assert.equal((await call(env, `/api/orders/${first.data.id}`)).status, 404);
  assert.equal(
    (
      await call(env, `/api/orders/${first.data.id}`, "GET", undefined, {
        Authorization: `Bearer ${input.access_token}`,
      })
    ).status,
    200,
  );
  assert.equal((await call(env, "/api/admin/products")).status, 403);
  assert.equal(
    (
      await call(env, "/api/admin/orders", "GET", undefined, {
        Authorization: `Bearer ${env.ADMIN_TOKEN}`,
      })
    ).status,
    200,
  );
});
test("unknown shipping, invalid address, unreviewed products, stock and quantity failures create no orders", async () => {
  for (const mutate of [
    (d) => {
      d.address.pincode = "110001";
    },
    (d) => {
      d.address.phone = "bad";
    },
    (d) => {
      d.items[0].quantity = 0;
    },
    (d) => {
      d.items[0].quantity = 4;
    },
    (d) => {
      d.items[0].quantity = 1.5;
    },
  ]) {
    const { env, calls } = setup();
    const d = fixture();
    mutate(d);
    assert.ok((await call(env, "/api/orders", "POST", d)).status >= 400);
    assert.equal(calls.length, 0);
    assert.equal(
      env.DB.db.prepare("SELECT count(*) AS n FROM orders").get().n,
      0,
    );
  }
  const { env } = setup();
  env.DB.db.exec("UPDATE products SET verified=0");
  assert.equal((await call(env, "/api/orders", "POST", fixture())).status, 422);
});
test("insufficient stock rolls back the entire multi-item order", async () => {
  const { env } = setup();
  env.DB.db.exec("UPDATE products SET stock=1");
  const d = fixture();
  d.items.push({ sku: "MVN-MASS-5KG", quantity: 2 });
  assert.equal((await call(env, "/api/orders", "POST", d)).status, 409);
  assert.equal(
    env.DB.db.prepare("SELECT count(*) AS n FROM orders").get().n,
    0,
  );
  assert.equal(
    env.DB.db.prepare("SELECT stock FROM products WHERE sku='MVN-MULTI'").get()
      .stock,
    1,
  );
});
test("client callback requires valid HMAC and captured amount matched by provider", async () => {
  const { env } = setup();
  const d = fixture();
  const order = (await call(env, "/api/orders", "POST", d)).data;
  const auth = { Authorization: `Bearer ${d.access_token}` };
  assert.equal(
    (
      await call(
        env,
        `/api/orders/${order.id}/verify`,
        "POST",
        { payment_id: "pay_fixture", signature: "wrong" },
        auth,
      )
    ).status,
    401,
  );
  const signed = await signature(
    env.RAZORPAY_KEY_SECRET,
    `${order.provider_order}|pay_fixture`,
  );
  assert.equal(
    (
      await call(
        env,
        `/api/orders/${order.id}/verify`,
        "POST",
        { payment_id: "pay_fixture", signature: signed },
        auth,
      )
    ).data.status,
    "paid",
  );
  assert.equal(
    (
      await call(
        env,
        `/api/orders/${order.id}/verify`,
        "POST",
        { payment_id: "pay_fixture", signature: signed },
        auth,
      )
    ).data.status,
    "paid",
  );
  assert.equal(
    env.DB.db.prepare("SELECT count(*) AS n FROM payment_events").get().n,
    1,
  );
});
test("mismatched provider amount never marks an order paid", async () => {
  const { env } = setup();
  const d = fixture();
  const order = (await call(env, "/api/orders", "POST", d)).data;
  env.PROVIDER_FETCH = async () =>
    Response.json({
      order_id: order.provider_order,
      amount: 1,
      currency: "INR",
      status: "captured",
    });
  const signed = await signature(
    env.RAZORPAY_KEY_SECRET,
    `${order.provider_order}|pay_fixture`,
  );
  assert.equal(
    (
      await call(
        env,
        `/api/orders/${order.id}/verify`,
        "POST",
        { payment_id: "pay_fixture", signature: signed },
        { Authorization: `Bearer ${d.access_token}` },
      )
    ).status,
    409,
  );
  assert.equal(
    env.DB.db.prepare("SELECT status FROM orders").get().status,
    "pending",
  );
});
test("webhooks validate raw-body HMAC and duplicate delivery is idempotent", async () => {
  const { env } = setup();
  const order = (await call(env, "/api/orders", "POST", fixture())).data;
  const raw = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: "pay_fixture", order_id: order.provider_order },
      },
    },
  });
  assert.equal(
    (
      await call(env, "/api/webhooks/razorpay", "POST", raw, {
        "X-Razorpay-Signature": "bad",
      })
    ).status,
    401,
  );
  const headers = {
    "X-Razorpay-Signature": await signature(env.RAZORPAY_WEBHOOK_SECRET, raw),
  };
  assert.equal(
    (await call(env, "/api/webhooks/razorpay", "POST", raw, headers)).data
      .status,
    "paid",
  );
  assert.equal(
    (await call(env, "/api/webhooks/razorpay", "POST", raw, headers)).data
      .status,
    "paid",
  );
  assert.equal(
    env.DB.db.prepare("SELECT count(*) AS n FROM payment_events").get().n,
    1,
  );
});
test("cancellation restores stock once; late capture enters manual review", async () => {
  const { env } = setup();
  const d = fixture();
  const order = (await call(env, "/api/orders", "POST", d)).data;
  const auth = { Authorization: `Bearer ${d.access_token}` };
  assert.equal(
    (await call(env, `/api/orders/${order.id}/cancel`, "POST", {}, auth)).data
      .status,
    "cancelled",
  );
  assert.equal(
    (await call(env, `/api/orders/${order.id}/cancel`, "POST", {}, auth))
      .status,
    409,
  );
  assert.equal(
    env.DB.db.prepare("SELECT stock FROM products WHERE sku='MVN-MULTI'").get()
      .stock,
    3,
  );
  const signed = await signature(
    env.RAZORPAY_KEY_SECRET,
    `${order.provider_order}|pay_fixture`,
  );
  assert.equal(
    (
      await call(
        env,
        `/api/orders/${order.id}/verify`,
        "POST",
        { payment_id: "pay_fixture", signature: signed },
        auth,
      )
    ).data.status,
    "paid_review",
  );
  assert.equal(
    (
      await call(
        env,
        "/api/admin/fulfill",
        "POST",
        { id: order.id },
        { Authorization: `Bearer ${env.ADMIN_TOKEN}` },
      )
    ).status,
    409,
  );
});
test("ambiguous provider timeout retains a single order and reservation for reconciliation", async () => {
  const { env, calls } = setup();
  env.PROVIDER_FETCH = async () => {
    calls.push("attempt");
    throw Error("timeout");
  };
  const d = fixture();
  const first = await call(env, "/api/orders", "POST", d);
  assert.equal(first.status, 202);
  assert.equal(first.data.status, "creating");
  assert.equal((await call(env, "/api/orders", "POST", d)).status, 202);
  assert.equal(calls.length, 1);
  assert.equal(
    env.DB.db.prepare("SELECT count(*) AS n FROM orders").get().n,
    1,
  );
});
test("stock loss between quote and commit rolls back all reservations atomically", async () => {
  const { env } = setup();
  env.DB.db.exec("UPDATE products SET stock=1");
  const original = env.DB.batch.bind(env.DB);
  env.DB.batch = async (statements) => {
    env.DB.db.exec("UPDATE products SET stock=0 WHERE sku='MVN-MULTI'");
    return original(statements);
  };
  const d = fixture();
  d.items.push({ sku: "MVN-MASS-5KG", quantity: 1 });
  const r = await call(env, "/api/orders", "POST", d);
  assert.equal(r.status, 409);
  assert.equal(
    env.DB.db.prepare("SELECT count(*) AS n FROM orders").get().n,
    0,
  );
  assert.equal(
    env.DB.db
      .prepare("SELECT stock FROM products WHERE sku='MVN-MASS-5KG'")
      .get().stock,
    1,
  );
});
test("admin edits use optimistic stock checks and never accept stale inventory", async () => {
  const { env } = setup();
  const p = env.DB.db
    .prepare("SELECT * FROM products WHERE sku='MVN-MULTI'")
    .get();
  const headers = { Authorization: `Bearer ${env.ADMIN_TOKEN}` };
  assert.equal(
    (
      await call(
        env,
        "/api/admin/products",
        "POST",
        { ...p, stock: 20, expected_stock: 99 },
        headers,
      )
    ).status,
    409,
  );
  assert.equal(
    env.DB.db.prepare("SELECT stock FROM products WHERE sku='MVN-MULTI'").get()
      .stock,
    3,
  );
  assert.equal(
    (
      await call(
        env,
        "/api/admin/products",
        "POST",
        { ...p, stock: 20, expected_stock: 3 },
        headers,
      )
    ).status,
    200,
  );
  assert.equal(
    env.DB.db.prepare("SELECT stock FROM products WHERE sku='MVN-MULTI'").get()
      .stock,
    20,
  );
});
test("cancellation during provider creation preserves the mapping and never reopens checkout", async () => {
  const { env } = setup();
  const original = env.PROVIDER_FETCH;
  env.PROVIDER_FETCH = async (url, options) => {
    const remote = await original(url, options);
    env.DB.db.exec("UPDATE orders SET status='cancelled'");
    return remote;
  };
  const r = await call(env, "/api/orders", "POST", fixture());
  assert.equal(r.data.status, "cancelled");
  assert.match(r.data.provider_order, /^order_/);
  assert.equal(
    env.DB.db.prepare("SELECT stock FROM products WHERE sku='MVN-MULTI'").get()
      .stock,
    3,
  );
});
test("malformed or oversized JSON and unverified tax never reach the payment service", async () => {
  const { env, calls } = setup();
  assert.equal((await call(env, "/api/orders", "POST", "{bad")).status, 400);
  assert.equal(
    (
      await call(
        env,
        "/api/orders",
        "POST",
        JSON.stringify({ huge: "x".repeat(33000) }),
      )
    ).status,
    413,
  );
  env.DB.db.exec("UPDATE products SET tax_bps=NULL");
  assert.equal((await call(env, "/api/orders", "POST", fixture())).status, 422);
  assert.equal(calls.length, 0);
});
test("Turnstile protection checks success, hostname and action before reserving stock", async () => {
  const { env, calls } = setup();
  env.TURNSTILE_SECRET = "challenge-fixture";
  env.TURNSTILE_SITE_KEY = "site-fixture";
  const d = { ...fixture(), turnstile_token: "fixture-token" };
  for (const result of [
    { success: false },
    { success: true, hostname: "evil.example", action: "checkout" },
    { success: true, hostname: "store.example", action: "other" },
  ]) {
    env.CHALLENGE_FETCH = async () => Response.json(result);
    assert.equal((await call(env, "/api/orders", "POST", d)).status, 403);
  }
  assert.equal(calls.length, 0);
  env.CHALLENGE_FETCH = async () =>
    Response.json({
      success: true,
      hostname: "store.example",
      action: "checkout",
    });
  assert.equal((await call(env, "/api/orders", "POST", d)).status, 201);
});
