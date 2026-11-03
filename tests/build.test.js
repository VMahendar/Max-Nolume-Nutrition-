import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
test("public artifact excludes backend, environment, tests and repository data", async () => {
  await import("../scripts/build.mjs");
  assert.deepEqual(readdirSync("dist/site").sort(), [
    "admin.html",
    "admin.js",
    "app.js",
    "checkout.html",
    "checkout.js",
    "commerce-bridge.js",
    "index.html",
    "policies.html",
    "retail.css",
    "robots.txt",
    "style.css",
  ]);
  assert.ok(existsSync("dist/max-volume-commerce/max-volume-commerce.php"));
  assert.ok(existsSync("dist/max-volume-commerce/templates/commerce.php"));
  assert.ok(existsSync("dist/max-volume-commerce/storefront/app.js"));
  assert.equal(existsSync("dist/site/.env.example"), false);
});
