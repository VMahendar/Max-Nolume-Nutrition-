const $ = (id) => document.getElementById(id);
let token = "";
const status = (text) => {
  $("status").textContent = text;
};
async function api(path, method = "GET", data) {
  const r = await fetch(`/api/admin/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  let result;
  try {
    result = await r.json();
  } catch {
    throw Error("The commerce service is not connected.");
  }
  if (!r.ok) throw Error(result.error || "Request failed.");
  return result;
}
function field(form, name, value, type = "text") {
  const label = document.createElement("label");
  label.textContent = name.replaceAll("_", " ");
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  if (type === "checkbox") input.checked = !!value;
  else input.value = value ?? "";
  if (type === "number") {
    input.min = 0;
    input.step = 1;
  }
  label.append(input);
  form.append(label);
  return input;
}
async function products() {
  const data = await api("products");
  $("products").replaceChildren();
  for (const p of data.products) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `${p.name} · stock ${p.stock} · ${p.verified ? "reviewed" : "review required"}`;
    const form = document.createElement("form");
    form.className = "product-admin";
    for (const key of ["sku", "name", "category", "image_url", "hsn"]) {
      const input = field(form, key, p[key]);
      if (key === "sku") input.readOnly = true;
    }
    for (const key of ["price_paise", "stock", "tax_bps"])
      field(form, key, p[key], "number");
    field(form, "verified", p.verified, "checkbox");
    field(form, "published", p.published, "checkbox");
    const note = document.createElement("p");
    note.textContent =
      "Stock means units currently available, excluding existing reservations. Verify approved imagery, labels, inventory, HSN and tax before marking reviewed. Prices and shipping rules are tax-inclusive.";
    const save = document.createElement("button");
    save.textContent = "Save product";
    form.append(note, save);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      for (const key of ["price_paise", "stock"]) d[key] = Number(d[key]);
      d.tax_bps = d.tax_bps === "" ? null : Number(d.tax_bps);
      d.verified = form.elements.verified.checked ? 1 : 0;
      d.published = form.elements.published.checked ? 1 : 0;
      d.expected_stock = p.stock;
      try {
        await api("products", "POST", d);
        status("Product saved.");
        await products();
      } catch (e) {
        status(e.message);
      }
    };
    details.append(summary, form);
    $("products").append(details);
  }
}
async function orders() {
  const data = await api("orders");
  $("orders").replaceChildren();
  for (const order of data.orders) {
    const row = document.createElement("div");
    row.className = "checkout-row";
    const info = document.createElement("span");
    info.textContent = `${order.id} · ${order.status} · ₹${(order.total_paise / 100).toFixed(2)}`;
    row.append(info);
    const view = document.createElement("button");
    view.textContent = "Delivery details";
    view.onclick = async () => {
      try {
        const detail = await api(`orders/${order.id}`);
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(detail, null, 2);
        row.append(pre);
        view.disabled = true;
      } catch (e) {
        status(e.message);
      }
    };
    row.append(view);
    if (order.status === "paid") {
      const button = document.createElement("button");
      button.textContent = "Mark fulfilled";
      button.onclick = async () => {
        try {
          await api("fulfill", "POST", { id: order.id });
          await orders();
          status("Fulfillment recorded.");
        } catch (e) {
          status(e.message);
        }
      };
      row.append(button);
    }
    if (order.status === "paid_review") {
      const warning = document.createElement("strong");
      warning.textContent =
        "Manual allocation/refund review required. Do not fulfill automatically.";
      row.append(warning);
    }
    $("orders").append(row);
  }
}
$("login").onsubmit = async (e) => {
  e.preventDefault();
  token = $("admin-token").value;
  $("admin-token").value = "";
  try {
    await Promise.all([products(), orders()]);
    $("panel").hidden = false;
    status("Connected.");
  } catch (e) {
    token = "";
    $("panel").hidden = true;
    status(e.message);
  }
};
$("logout").onclick = () => {
  token = "";
  $("panel").hidden = true;
  $("products").replaceChildren();
  $("orders").replaceChildren();
  status("Administrator session cleared.");
};
$("reload").onclick = () => orders().catch((e) => status(e.message));
$("shipping").onsubmit = async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  d.fee_paise = Number(d.fee_paise);
  d.tax_bps = Number(d.tax_bps);
  d.verified = 1;
  try {
    await api("shipping", "POST", d);
    status("Verified shipping rule saved.");
  } catch (e) {
    status(e.message);
  }
};
$("reconcile").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("reconcile", "POST", Object.fromEntries(new FormData(e.target)));
    status(
      "Provider order verified and linked. Customer can check payment status or retry the same checkout.",
    );
    await orders();
  } catch (e) {
    status(e.message);
  }
};

$("verify-payment").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const result = await api(
      "verify-payment",
      "POST",
      Object.fromEntries(new FormData(e.target)),
    );
    status(`Provider verification result: ${result.status}`);
    await orders();
  } catch (e) {
    status(e.message);
  }
};
