const el = (id) => document.getElementById(id);
const rupees = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n / 100,
  );
let catalogue = [],
  cart = [],
  config = {},
  priced = null,
  attempt = null,
  busy = false,
  turnstileToken = "",
  turnstileWidget;
function stored(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw Error(
      "Browser storage is required to retain secure guest order access. Please enable it or use WhatsApp.",
    );
  }
}
function status(message) {
  el("status").textContent = message;
}
async function api(path, method = "GET", data, token) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  let value;
  try {
    value = await response.json();
  } catch {
    throw Error(
      "Commerce service is not connected. Use the storefront WhatsApp enquiry.",
    );
  }
  if (!response.ok) throw Error(value.error || "Request failed.");
  return value;
}
function cartUI() {
  el("cart").replaceChildren();
  for (const item of cart) {
    const p = catalogue.find((p) => p.sku === item.sku);
    if (!p) continue;
    const row = document.createElement("div");
    row.className = "checkout-row";
    const name = document.createElement("span");
    name.textContent = `${p.name} · ${rupees(p.price_paise)} each`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "99";
    input.value = item.quantity;
    input.setAttribute("aria-label", `Quantity for ${p.name}`);
    input.onchange = () => {
      const n = Number(input.value);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        input.value = item.quantity;
        return;
      }
      item.quantity = n;
      save("mvnRetailCart", cart);
      invalidate();
    };
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.onclick = () => {
      cart = cart.filter((x) => x !== item);
      save("mvnRetailCart", cart);
      cartUI();
      invalidate();
    };
    row.append(name, input, remove);
    el("cart").append(row);
  }
  if (!cart.length)
    el("cart").textContent =
      "Your retail cart is empty. Choose a product from the shop.";
  el("quote").disabled = !cart.length;
}
function invalidate() {
  priced = null;
  el("pay").hidden = true;
  el("summary").textContent = "";
}
function payload() {
  return {
    items: cart.map(({ sku, quantity }) => ({ sku, quantity })),
    address: Object.fromEntries(new FormData(el("checkout-form"))),
  };
}
function orderUI(order) {
  el("order-section").hidden = false;
  el("order-info").textContent =
    `${order.id} · ${order.status}${order.total_paise ? ` · ${rupees(order.total_paise)}` : ""}`;
  el("cancel-order").hidden = !["creating", "pending"].includes(order.status);
  if (order.status === "paid") {
    status("Payment verified. Your order is paid. Save your order reference.");
    save("mvnRetailCart", []);
  } else if (order.status === "paid_review") {
    status(
      "Payment was captured after cancellation or release. Contact support for allocation or refund review; this order is not ready for fulfillment.",
    );
  } else if (order.status === "creating") {
    status(
      "The provider order is awaiting reconciliation. Do not create a second payment. Contact support with your reference.",
    );
  } else if (order.status === "fulfilled") {
    status(
      "Your order has been fulfilled. Contact support for delivery tracking.",
    );
  }
}
async function refresh() {
  if (!attempt?.id) return;
  const order = await api(
    `/api/orders/${attempt.id}`,
    "GET",
    null,
    attempt.access_token,
  );
  orderUI(order);
  return order;
}
async function razorpayScript() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () =>
      reject(
        Error("Payment checkout could not load. Your order remains unpaid."),
      );
    document.head.append(script);
  });
}
async function pay() {
  if (busy || !priced) return;
  busy = true;
  el("pay").disabled = true;
  try {
    const data = payload();
    const snapshot = JSON.stringify(data);
    if (attempt && attempt.snapshot !== snapshot) {
      const current = await refresh();
      if (current && !["cancelled", "expired"].includes(current.status))
        throw Error(
          "Your previous checkout is still open. Cancel it before changing the cart/address.",
        );
      attempt = null;
    }
    if (!attempt) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      attempt = {
        request_key: crypto.randomUUID(),
        access_token: [...bytes]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join(""),
        snapshot,
      };
      save("mvnRetailAttempt", attempt);
    }
    const order = await api("/api/orders", "POST", {
      ...data,
      request_key: attempt.request_key,
      access_token: attempt.access_token,
      turnstile_token: turnstileToken,
    });
    if (window.turnstile && turnstileWidget !== undefined)
      window.turnstile.reset(turnstileWidget);
    attempt.id = order.id;
    save("mvnRetailAttempt", attempt);
    orderUI(order);
    if (order.status !== "pending") return;
    await razorpayScript();
    new window.Razorpay({
      key: order.key_id,
      order_id: order.provider_order,
      amount: order.total_paise,
      currency: "INR",
      name: "Max Volume Nutrition",
      prefill: {
        name: data.address.name,
        email: data.address.email,
        contact: data.address.phone,
      },
      theme: { color: "#087fd0" },
      handler: async (response) => {
        status("Verifying payment with the server…");
        try {
          const confirmed = await api(
            `/api/orders/${order.id}/verify`,
            "POST",
            {
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            },
            attempt.access_token,
          );
          orderUI(confirmed);
          el("pay").hidden = true;
        } catch (e) {
          status(
            `${e.message} Use Check payment status; do not pay again until reconciled.`,
          );
        }
      },
      modal: {
        ondismiss: () =>
          status(
            "Payment window closed. Use Check payment status before retrying.",
          ),
      },
    }).open();
  } catch (e) {
    status(e.message);
  } finally {
    busy = false;
    el("pay").disabled = false;
  }
}
el("checkout-form").addEventListener("input", invalidate);
el("checkout-form").onsubmit = async (e) => {
  e.preventDefault();
  if (busy) return;
  busy = true;
  el("quote").disabled = true;
  try {
    if (!config.checkout_enabled)
      throw Error(
        "Online checkout is awaiting merchant, stock, tax and shipping setup. WhatsApp enquiries remain available.",
      );
    priced = await api("/api/quote", "POST", payload());
    el("summary").textContent =
      `Total ${rupees(priced.total_paise)} · shipping ${rupees(priced.shipping_paise)} · included tax ${rupees(priced.tax_paise)} (${priced.tax_kind})`;
    el("pay").hidden = false;
    status(
      config.payment_mode === "test"
        ? "TEST MODE: this is not a live customer payment service."
        : "Review the total, then pay securely.",
    );
  } catch (e) {
    status(e.message);
  } finally {
    busy = false;
    el("quote").disabled = !cart.length;
  }
};
el("pay").onclick = pay;
el("refresh-order").onclick = () => refresh().catch((e) => status(e.message));
el("cancel-order").onclick = async () => {
  try {
    const order = await api(
      `/api/orders/${attempt.id}/cancel`,
      "POST",
      {},
      attempt.access_token,
    );
    orderUI(order);
    status(order.message);
    attempt = null;
    save("mvnRetailAttempt", null);
    invalidate();
  } catch (e) {
    status(e.message);
  }
};
const states = [
  ["01", "Jammu and Kashmir"],
  ["02", "Himachal Pradesh"],
  ["03", "Punjab"],
  ["04", "Chandigarh"],
  ["05", "Uttarakhand"],
  ["06", "Haryana"],
  ["07", "Delhi"],
  ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"],
  ["10", "Bihar"],
  ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"],
  ["14", "Manipur"],
  ["15", "Mizoram"],
  ["16", "Tripura"],
  ["17", "Meghalaya"],
  ["18", "Assam"],
  ["19", "West Bengal"],
  ["20", "Jharkhand"],
  ["21", "Odisha"],
  ["22", "Chhattisgarh"],
  ["23", "Madhya Pradesh"],
  ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"],
  ["29", "Karnataka"],
  ["30", "Goa"],
  ["31", "Lakshadweep"],
  ["32", "Kerala"],
  ["33", "Tamil Nadu"],
  ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"],
  ["37", "Andhra Pradesh"],
  ["38", "Ladakh"],
];
for (const [value, label] of states) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  el("checkout-form").elements.state_code.append(option);
}
(async () => {
  try {
    const [data, settings] = await Promise.all([
      api("/api/products"),
      api("/api/config"),
    ]);
    catalogue = data.products;
    config = settings;
    if (config.turnstile_site_key) {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.onload = () => {
        turnstileWidget = window.turnstile.render("#turnstile", {
          sitekey: config.turnstile_site_key,
          action: "checkout",
          callback: (token) => {
            turnstileToken = token;
          },
          "expired-callback": () => {
            turnstileToken = "";
          },
          "error-callback": () => {
            turnstileToken = "";
            status(
              "Bot protection could not load. Please refresh or contact support.",
            );
          },
        });
      };
      script.onerror = () =>
        status("Bot protection could not load. Checkout cannot proceed.");
      document.head.append(script);
    }
    cart = stored("mvnRetailCart", []);
    if (!Array.isArray(cart)) cart = [];
    cart = cart.filter(
      (x) =>
        x &&
        catalogue.some((p) => p.sku === x.sku) &&
        Number.isInteger(x.quantity) &&
        x.quantity > 0 &&
        x.quantity <= 99,
    );
    const sku = new URLSearchParams(location.search).get("sku");
    if (sku && catalogue.some((p) => p.sku === sku)) {
      const existing = cart.find((x) => x.sku === sku);
      if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
      else cart.push({ sku, quantity: 1 });
      save("mvnRetailCart", cart);
      history.replaceState(null, "", location.pathname);
    }
    cartUI();
    attempt = stored("mvnRetailAttempt", null);
    if (attempt?.id) await refresh();
    else
      status(
        config.checkout_enabled
          ? config.payment_mode === "test"
            ? "Test-mode checkout. No live charges."
            : "Enter your delivery details for a final quote."
          : "Online checkout is awaiting setup. Use WhatsApp for current enquiries.",
      );
  } catch (e) {
    status(e.message);
    el("quote").disabled = true;
  }
})();
