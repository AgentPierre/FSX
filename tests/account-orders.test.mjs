import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const next = require("next/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });
const publicOrder = loadModule(new URL("../lib/public-order.ts", import.meta.url), {});
const views = loadModule(new URL("../lib/views.ts", import.meta.url), {});

const SECRETS = ["secret@example.invalid", "7135550100", "cs_test_secret", "user-a"];

const order = (over = {}) => ({
  id: "11111111-1111-4111-8111-111111111111", orderNumber: "0007", customerName: "Maria",
  customerEmail: "secret@example.invalid", customerPhone: "7135550100", customerUserId: "user-a",
  pickupTime: "2026-11-03T18:00:00.000Z", paymentStatus: "paid", ticketStatus: "ready",
  paidAt: "2026-11-03T17:00:00.000Z", subtotalCents: 1299, taxCents: 107, totalCents: 1406, taxRateBps: 825,
  stripeSessionId: "cs_test_secret", createdAt: "2026-11-03T16:59:00.000Z",
  lines: [{ sizeId: "s1", itemCode: "G11", nameSnapshot: "Sesame Chicken", sizeName: "regular", unitPriceCents: 1299,
    quantity: 1, spicy: false, instructions: "extra sauce", components: [] }],
  ...over,
});

/** Real requireUser and listMyOrders; only Supabase Auth, the data-mode switch and the store are replaced. */
function load({ user = { id: "user-a" }, orders = [], reads = [], stub = false } = {}) {
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }) } };
  const auth = loadModule(new URL("../lib/auth.ts", import.meta.url), {
    "./errors": errors, "./data/mode": { usingStub: () => stub }, "./supabase/server": { createClient: async () => client },
  });
  const store = { listCustomerOrders: async (id) => { reads.push(id); return orders; } };
  return loadModule(new URL("../lib/account-orders.ts", import.meta.url), {
    "./auth": auth, "./data": { store }, "./public-order": publicOrder,
  });
}
const request = (headers = {}) => ({ headers: new Headers(headers) });

test("no session means 401, and the store is never read", async () => {
  const reads = [];
  await assert.rejects(load({ user: null, reads }).listMyOrders(request()), (e) => e.status === 401 && e.code === "unauthenticated");
  assert.deepEqual(reads, []);
});

test("a signed-in customer gets their orders in the reduced public shape, with nothing private", async () => {
  const result = await load({ orders: [order()] }).listMyOrders(request());
  assert.equal(result.orders.length, 1);
  assert.deepEqual(Object.keys(result.orders[0]).sort(),
    ["id", "lines", "orderNumber", "paymentStatus", "pickupTime", "subtotalCents", "taxCents", "ticketStatus", "totalCents"]);
  const json = JSON.stringify(result);
  for (const secret of SECRETS) assert.equal(json.includes(secret), false, `response must not contain ${secret}`);
  assert.equal(result.orders[0].lines[0].instructions, "extra sauce", "a customer sees their own notes");
});

test("the store is asked only for the verified account, and a header cannot pick another one in live mode", async () => {
  const reads = [];
  await load({ reads }).listMyOrders(request({ "x-stub-user": "user-b" }));
  assert.deepEqual(reads, ["user-a"]);
});

test("a store that returns someone else's, an unpaid or a guest order still cannot leak it", async () => {
  const mine = order();
  const result = await load({ orders: [
    order({ id: "22222222-2222-4222-8222-222222222222", customerUserId: "user-b" }),
    order({ id: "33333333-3333-4333-8333-333333333333", paymentStatus: "pending_payment", ticketStatus: null }),
    order({ id: "44444444-4444-4444-8444-444444444444", customerUserId: null }),
    order({ id: "55555555-5555-4555-8555-555555555555", customerUserId: undefined }),
    mine,
  ] }).listMyOrders(request());
  assert.deepEqual(result.orders.map((o) => o.id), [mine.id]);
});

test("development stub mode takes the account from the stub header and still needs one", async () => {
  const reads = [];
  await load({ stub: true, reads }).listMyOrders(request({ "x-stub-user": "user-z" }));
  assert.deepEqual(reads, ["user-z"]);
  await assert.rejects(load({ stub: true }).listMyOrders(request()), (e) => e.status === 401);
});

test("the route answers 200 with no-store and noindex, and 401 as the standard error", async () => {
  const route = (account) => loadModule(new URL("../app/api/account/orders/route.ts", import.meta.url), {
    "next/server": next, "@/lib/errors": errors, "@/lib/account-orders": account,
  });
  const ok = await route(load({ orders: [order()] })).GET(request());
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Cache-Control"), "private, no-store");
  assert.equal(ok.headers.get("X-Robots-Tag"), "noindex");
  assert.equal((await ok.json()).orders.length, 1);
  const denied = await route(load({ user: null })).GET(request());
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await denied.json(), { error: { code: "unauthenticated", message: "Sign in required." } });
});

test("no view of an order ever returns the account id", () => {
  const o = order();
  for (const view of [publicOrder.toPublicOrder(o), views.toKitchenTicket(o), views.toOwnerOrder(o)]) {
    assert.equal(JSON.stringify(view).includes("user-a"), false);
    assert.equal("customerUserId" in view, false);
  }
});

test("the stub store lists only that account's paid orders, newest first", async () => {
  const menu = loadModule(new URL("../lib/data/menu.ts", import.meta.url), {});
  const { stubStore } = loadModule(new URL("../lib/data/stub.ts", import.meta.url), { "./menu": menu }, { crypto: globalThis.crypto });
  const place = async (customerUserId, createdAt, pay = true) => {
    const input = order({ customerUserId, paymentStatus: "pending_payment", ticketStatus: null });
    for (const key of ["id", "orderNumber", "createdAt", "paidAt"]) delete input[key];
    const placed = await stubStore.insertOrder(input);
    placed.createdAt = createdAt;
    if (pay) { await stubStore.setStripeSession(placed.id, `cs_${placed.id}`); await stubStore.markPaid(placed.id, `cs_${placed.id}`); }
    return placed;
  };
  const older = await place("user-a", "2026-11-01T10:00:00.000Z");
  const newer = await place("user-a", "2026-11-02T10:00:00.000Z");
  await place("user-a", "2026-11-03T10:00:00.000Z", false); // never paid
  await place("user-b", "2026-11-03T11:00:00.000Z");
  await place(null, "2026-11-03T12:00:00.000Z");
  assert.deepEqual([...(await stubStore.listCustomerOrders("user-a")).map((o) => o.id)], [newer.id, older.id]);
  assert.equal((await stubStore.listCustomerOrders("user-b")).length, 1);
  assert.equal((await stubStore.listCustomerOrders("nobody")).length, 0);
});

test("the live store query is limited to the account, paid orders, newest first, 50 at most", async () => {
  const calls = [];
  const rows = {
    orders: [{ id: "o1", display_order_number: "0007", customer_name: "Maria", customer_email: "secret@example.invalid",
      customer_phone: null, customer_user_id: "user-a", pickup_at: "2026-11-03T18:00:00Z", payment_status: "paid",
      ticket_status: "ready", subtotal_cents: 1299, tax_cents: 107, total_cents: 1406, tax_rate: 0.0825,
      created_at: "2026-11-03T16:59:00Z" }],
    payments: [{ order_id: "o1", stripe_checkout_session_id: "cs_test_secret", paid_at: "2026-11-03T17:00:00Z" }],
  };
  const admin = { from(table) {
    calls.push(["from", table]);
    const builder = {
      select: () => builder, in: () => builder,
      eq: (column, value) => { calls.push(["eq", column, value]); return builder; },
      order: (column, options) => { calls.push(["order", column, options?.ascending]); return builder; },
      limit: (n) => { calls.push(["limit", n]); return builder; },
      then: (resolve) => resolve({ data: rows[table] ?? [], error: null }),
    };
    return builder;
  } };
  const { supabaseStore } = loadModule(new URL("../lib/data/supabase.ts", import.meta.url), {
    "../supabase/admin": { createAdminClient: () => admin }, "../supabase/server": { createClient: async () => ({}) }, "../errors": errors,
  });
  const found = await supabaseStore.listCustomerOrders("user-a");
  assert.deepEqual(calls[0], ["from", "orders"]);
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "customer_user_id" && c[2] === "user-a"), "filters by account");
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "payment_status" && c[2] === "paid"), "paid orders only");
  assert.ok(calls.some((c) => c[0] === "order" && c[1] === "created_at" && c[2] === false), "newest first");
  assert.ok(calls.some((c) => c[0] === "limit" && c[1] === 50), "at most 50");
  assert.equal(found[0].customerUserId, "user-a");
  assert.equal(found[0].orderNumber, "0007");
});
