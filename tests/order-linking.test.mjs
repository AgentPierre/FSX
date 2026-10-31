import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const next = require("next/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });
const publicOrder = loadModule(new URL("../lib/public-order.ts", import.meta.url), {});

/**
 * The real order route, real account-orders and real auth. Only Supabase Auth, the store, Stripe and the
 * order service are replaced, so this exercises the actual linking path in the order it runs.
 */
function checkout({ user = { id: "user-a" }, linkFails = false, stub = false } = {}) {
  const calls = [];
  const logs = [];
  const order = { id: "order-test", orderNumber: "0042", customerEmail: "test@example.invalid", lines: [], totalCents: 100, taxCents: 0 };
  const store = {
    async setOrderCustomer(orderId, userId) {
      calls.push(`link:${orderId}:${userId}`);
      if (linkFails) throw new errors.ApiError(503, "database_unavailable", "private-customer@example.invalid exploded");
    },
    async setStripeSession() { calls.push("attach-session"); },
    async expireOrder() { calls.push("expire-order"); },
  };
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }) } };
  const auth = loadModule(new URL("../lib/auth.ts", import.meta.url), {
    "./errors": errors, "./data/mode": { usingStub: () => stub }, "./supabase/server": { createClient: async () => client },
  });
  const account = loadModule(new URL("../lib/account-orders.ts", import.meta.url), {
    "./auth": auth, "./data": { store }, "./errors": errors, "./public-order": publicOrder,
  }, { console: { error: (...args) => logs.push(args) } });
  const { POST } = loadModule(new URL("../app/api/orders/route.ts", import.meta.url), {
    "next/server": next, "@/lib/errors": errors, "@/lib/account-orders": account, "@/lib/data": { store },
    "@/lib/orders": { async createPendingOrder() {
      calls.push("create-order");
      return { order, earliestPickup: new Date("2026-11-03T18:00:00Z") };
    } },
    "@/lib/stripe": {
      getStripe: () => ({ checkout: { sessions: { async create() { calls.push("create-session"); return { id: "cs_test", url: "https://checkout.stripe.com/test" }; } } } }),
      siteTag: () => "fsx-test", stripeConfigured: () => true,
    },
    "@/lib/validation": { createOrderSchema: {}, parseBody: async () => ({}) },
  });
  const post = (headers = {}) => POST({ headers: new Headers(headers) });
  return { calls, logs, post };
}

test("a signed-in customer's new order is linked to their account before the Stripe session is created", async () => {
  const { calls, post } = checkout();
  const response = await post();
  assert.equal(response.status, 201);
  assert.deepEqual([...calls], ["create-order", "link:order-test:user-a", "create-session", "attach-session"]);
});

test("a guest checkout links nothing and works exactly as before", async () => {
  const { calls, post } = checkout({ user: null });
  const response = await post();
  assert.equal(response.status, 201);
  assert.deepEqual([...calls], ["create-order", "create-session", "attach-session"]);
});

test("a failed link never blocks checkout and logs no customer data", async () => {
  const { calls, logs, post } = checkout({ linkFails: true });
  const response = await post();
  assert.equal(response.status, 201);
  assert.ok(calls.includes("create-session"), "payment still starts");
  assert.equal(logs.length, 1);
  assert.equal(JSON.stringify(logs).includes("private-customer@example.invalid"), false);
  assert.deepEqual({ ...logs[0][1] }, { orderId: "order-test", code: "database_unavailable" });
});

test("in live mode a header cannot choose which account gets the order", async () => {
  const { calls, post } = checkout({ user: null });
  await post({ "x-stub-user": "user-b" });
  assert.equal(calls.some((c) => c.startsWith("link:")), false);
  const signedIn = checkout({ user: { id: "user-a" } });
  await signedIn.post({ "x-stub-user": "user-b" });
  assert.ok(signedIn.calls.includes("link:order-test:user-a"));
});

test("the stub store links only a pending, unlinked order and never reassigns it", async () => {
  const menu = loadModule(new URL("../lib/data/menu.ts", import.meta.url), {});
  const { stubStore } = loadModule(new URL("../lib/data/stub.ts", import.meta.url), { "./menu": menu }, { crypto: globalThis.crypto });
  const input = () => ({
    customerName: "Maria", customerEmail: "m@example.invalid", customerPhone: null, pickupTime: "2026-11-03T18:00:00.000Z",
    paymentStatus: "pending_payment", ticketStatus: null, subtotalCents: 100, taxCents: 8, totalCents: 108, taxRateBps: 825,
    stripeSessionId: null, lines: [],
  });
  const first = await stubStore.insertOrder(input());
  await stubStore.setOrderCustomer(first.id, "user-a");
  assert.equal((await stubStore.getOrder(first.id)).customerUserId, "user-a");
  await stubStore.setOrderCustomer(first.id, "user-b");
  assert.equal((await stubStore.getOrder(first.id)).customerUserId, "user-a", "an existing link is never reassigned");
  const paid = await stubStore.insertOrder(input());
  await stubStore.setStripeSession(paid.id, "cs_paid");
  await stubStore.markPaid(paid.id, "cs_paid");
  await stubStore.setOrderCustomer(paid.id, "user-a");
  assert.equal((await stubStore.getOrder(paid.id)).customerUserId ?? null, null, "a paid order cannot be linked afterwards");
});

test("the live store update only touches a pending order that has no account yet", async () => {
  const calls = [];
  const admin = { from(table) {
    calls.push(["from", table]);
    const builder = {
      update: (values) => { calls.push(["update", values]); return builder; },
      eq: (column, value) => { calls.push(["eq", column, value]); return builder; },
      is: (column, value) => { calls.push(["is", column, value]); return builder; },
      then: (resolve) => resolve({ data: null, error: null }),
    };
    return builder;
  } };
  const { supabaseStore } = loadModule(new URL("../lib/data/supabase.ts", import.meta.url), {
    "../supabase/admin": { createAdminClient: () => admin }, "../supabase/server": { createClient: async () => ({}) }, "../errors": errors,
  });
  await supabaseStore.setOrderCustomer("order-1", "user-a");
  assert.deepEqual(calls[0], ["from", "orders"]);
  assert.deepEqual([calls[1][0], { ...calls[1][1] }], ["update", { customer_user_id: "user-a" }]);
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "id" && c[2] === "order-1"));
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "payment_status" && c[2] === "pending_payment"));
  assert.ok(calls.some((c) => c[0] === "is" && c[1] === "customer_user_id" && c[2] === null));
});
