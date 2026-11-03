import { fail, text, positiveInt } from "./security.js";
export function address(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail(400, "Address required.");
  const a = {};
  for (const field of [
    "name",
    "phone",
    "email",
    "line1",
    "city",
    "state_code",
    "pincode",
  ])
    a[field] = text(input[field], field, field === "line1" ? 300 : 120);
  if (!/^[6-9][0-9]{9}$/.test(a.phone))
    fail(400, "Enter a ten-digit Indian mobile number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) fail(400, "Invalid email.");
  if (!/^[1-9][0-9]{5}$/.test(a.pincode) || !/^\d{2}$/.test(a.state_code))
    fail(400, "Invalid pincode/state.");
  return a;
}
export function cart(input) {
  if (!Array.isArray(input) || !input.length || input.length > 30)
    fail(400, "Cart must contain 1–30 items.");
  const combined = new Map();
  for (const item of input) {
    if (!item || typeof item !== "object") fail(400, "Invalid cart item.");
    const sku = text(item.sku, "SKU", 80);
    const qty = positiveInt(item.quantity, "quantity", 99, 1);
    combined.set(sku, (combined.get(sku) || 0) + qty);
  }
  return [...combined]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, quantity]) => ({
      sku,
      quantity: positiveInt(quantity, "combined quantity", 99, 1),
    }));
}
export async function quote(env, data) {
  const destination = address(data.address);
  const items = cart(data.items);
  const shipping = await env.DB.prepare(
    "SELECT state_code,fee_paise,tax_bps FROM shipping_zones WHERE pincode=? AND verified=1",
  )
    .bind(destination.pincode)
    .first();
  if (!shipping)
    fail(
      422,
      "Shipping to this pincode has not been verified. Please request a WhatsApp quote.",
    );
  if (shipping.state_code !== destination.state_code)
    fail(400, "State does not match the configured pincode.");
  const lines = [];
  let total = shipping.fee_paise;
  let tax = Math.round(
    (shipping.fee_paise * shipping.tax_bps) / (10000 + shipping.tax_bps),
  );
  for (const item of items) {
    const p = await env.DB.prepare(
      "SELECT sku,name,price_paise,stock,verified,hsn,tax_bps FROM products WHERE sku=? AND published=1",
    )
      .bind(item.sku)
      .first();
    if (!p || !p.verified || !p.hsn || p.tax_bps === null)
      fail(422, "A product is awaiting stock, label or tax verification.");
    if (p.stock < item.quantity) fail(409, `Insufficient stock for ${p.name}.`);
    const amount = p.price_paise * item.quantity;
    const itemTax = Math.round((amount * p.tax_bps) / (10000 + p.tax_bps));
    positiveInt(amount, "line amount");
    total += amount;
    tax += itemTax;
    lines.push({
      ...item,
      name: p.name,
      unit_paise: p.price_paise,
      tax_paise: itemTax,
    });
  }
  positiveInt(total, "order amount", 99999999, 100);
  const kind =
    shipping.state_code === (env.ORIGIN_STATE || "33") ? "CGST_SGST" : "IGST";
  return {
    items: lines,
    address: destination,
    total_paise: total,
    shipping_paise: shipping.fee_paise,
    tax_paise: tax,
    tax_kind: kind,
    taxes:
      kind === "IGST"
        ? { igst_paise: tax }
        : {
            cgst_paise: Math.floor(tax / 2),
            sgst_paise: tax - Math.floor(tax / 2),
          },
  };
}
