const encoder = new TextEncoder();
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new ApiError(status, message);
};
export function secureEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++)
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export async function digest(value) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function signature(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function body(request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    fail(415, "JSON required.");
  const raw = await limitedText(request);
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data))
      fail(400, "Object required.");
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(400, "Invalid JSON.");
  }
}
export async function limitedText(request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 32768) {
      await reader.cancel();
      fail(413, "Request too large.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const value of chunks) {
    all.set(value, offset);
    offset += value.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(all);
}
export function text(value, name, max = 200) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f]/.test(value)
  )
    fail(400, `Invalid ${name}.`);
  return value.trim();
}
export function positiveInt(value, name, max = 99999999, min = 0) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(400, `Invalid ${name}.`);
  return value;
}
export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin !== new URL(request.url).origin)
    fail(403, "Same-origin request required.");
}
export function admin(request, env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32)
    fail(503, "Administration not configured.");
  if (
    !secureEqual(
      request.headers.get("Authorization") || "",
      `Bearer ${env.ADMIN_TOKEN}`,
    )
  )
    fail(403, "Not authorized.");
}
export async function throttle(request, env, scope, limit = 15) {
  const now = Date.now();
  const window = Math.floor(now / 600000);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const key = await digest(`${scope}|${ip}|${window}`);
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits(bucket,hits,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits",
  )
    .bind(key, now + 1200000)
    .first();
  if (row.hits > limit) fail(429, "Too many requests. Try again later.");
}
