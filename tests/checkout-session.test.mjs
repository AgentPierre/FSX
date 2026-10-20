import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Exercise the actual route without Stripe credentials, a database or a Next dev server.
// Only its external boundaries are replaced; TypeScript is already a project dependency.
function loadModule(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const wrapper = vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`, {
    process, console: { error() {} },
  });
  wrapper((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

const next = require("next/server");
const errors = loadModule("../lib/errors.ts", { "next/server": next });

function route({ createFails = false, attachFails = false, cleanupFails = false, missingUrl = false } = {}) {
  const calls = [];
  const order = {
    id: "order-test", orderNumber: "0042", customerEmail: "test@example.invalid",
    lines: [], totalCents: 100, taxCents: 0,
  };
  const sessions = {
    async create() {
      calls.push("create-session");
      if (createFails) throw new Error("Stripe unavailable");
      return { id: "cs_test_example", url: missingUrl ? null : "https://checkout.stripe.com/test" };
    },
    async expire(id) {
      calls.push(`expire-session:${id}`);
      if (cleanupFails) throw new Error("Cleanup unavailable");
    },
  };
  const { POST } = loadModule("../app/api/orders/route.ts", {
    "next/server": next,
    "@/lib/data": { store: {
      async setStripeSession() {
        calls.push("attach-session");
        if (attachFails) throw new Error("Database attachment failed");
      },
      async expireOrder(id) { calls.push(`expire-order:${id}`); },
    } },
    "@/lib/errors": errors,
    "@/lib/orders": { async createPendingOrder() {
      return { order, earliestPickup: new Date("2026-10-20T18:00:00Z") };
    } },
    "@/lib/stripe": {
      getStripe: () => ({ checkout: { sessions } }), siteTag: () => "fsx-test", stripeConfigured: () => true,
    },
    "@/lib/validation": { createOrderSchema: {}, parseBody: async () => ({}) },
  });
  return { calls, POST };
}

test("failed attachment expires the Stripe session before the order and returns no checkout URL", async () => {
  const { calls, POST } = route({ attachFails: true });
  const response = await POST({});
  assert.equal(response.status, 502);
  assert.equal((await response.json()).checkoutUrl, undefined);
  assert.deepEqual(calls, ["create-session", "attach-session", "expire-session:cs_test_example", "expire-order:order-test"]);
});

test("Stripe cleanup failure still expires the order and returns a controlled error", async () => {
  const { calls, POST } = route({ attachFails: true, cleanupFails: true });
  assert.equal((await POST({})).status, 502);
  assert.equal(calls.at(-1), "expire-order:order-test");
});

test("failed Stripe creation has no session to expire", async () => {
  const { calls, POST } = route({ createFails: true });
  assert.equal((await POST({})).status, 502);
  assert.deepEqual(calls, ["create-session", "expire-order:order-test"]);
});

test("missing checkout URL also cleans up the newly created session", async () => {
  const { calls, POST } = route({ missingUrl: true });
  assert.equal((await POST({})).status, 502);
  assert.deepEqual(calls, ["create-session", "expire-session:cs_test_example", "expire-order:order-test"]);
});

test("successful checkout keeps its attached session payable", async () => {
  const { calls, POST } = route();
  const response = await POST({});
  assert.equal(response.status, 201);
  assert.equal((await response.json()).checkoutUrl, "https://checkout.stripe.com/test");
  assert.deepEqual(calls, ["create-session", "attach-session"]);
});
