import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);

const next = require("next/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });

function route({ createFails = false, attachFails = false, cleanupFails = false, expireFails = false, missingUrl = false } = {}) {
  const calls = [];
  const logs = [];
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
  const { POST } = loadModule(new URL("../app/api/orders/route.ts", import.meta.url), {
    "next/server": next,
    "@/lib/data": { store: {
      async setStripeSession() {
        calls.push("attach-session");
        if (attachFails) throw new Error("Database attachment failed: private-customer@example.invalid");
      },
      async expireOrder(id) {
        calls.push(`expire-order:${id}`);
        if (expireFails) throw new Error("Database cleanup failed");
      },
    } },
    "@/lib/errors": errors,
    "@/lib/orders": { async createPendingOrder() {
      return { order, earliestPickup: new Date("2026-10-20T18:00:00Z") };
    } },
    "@/lib/stripe": {
      getStripe: () => ({ checkout: { sessions } }), siteTag: () => "fsx-test", stripeConfigured: () => true,
    },
    "@/lib/validation": { createOrderSchema: {}, parseBody: async () => ({}) },
  }, { console: { error: (...args) => logs.push(args) } });
  return { calls, logs, POST };
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
  assert.equal(response.headers.get("Location"), "/api/orders/order-test");
  assert.equal((await response.json()).checkoutUrl, "https://checkout.stripe.com/test");
  assert.deepEqual(calls, ["create-session", "attach-session"]);
});

test("both cleanup failures preserve the controlled checkout error and log safe reconciliation context", async () => {
  const { calls, logs, POST } = route({ attachFails: true, cleanupFails: true, expireFails: true });
  const response = await POST({});
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.error.code, "stripe_error");
  assert.equal(body.checkoutUrl, undefined);
  assert.equal(calls.at(-1), "expire-order:order-test");
  assert.equal(logs.length, 3);
  assert.match(JSON.stringify(logs), /order-test/);
  assert.doesNotMatch(JSON.stringify(logs), /private-customer|Database attachment failed/);
});
