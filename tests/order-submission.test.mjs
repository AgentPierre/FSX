import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const next = require("next/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });
const validation = loadModule(new URL("../lib/validation.ts", import.meta.url), {
  zod: require("zod"), "./errors": errors,
}, { TextDecoder });
const rules = loadModule(new URL("../lib/menu-rules.ts", import.meta.url), {});
const money = loadModule(new URL("../lib/money.ts", import.meta.url), {});

const input = (changes = {}) => ({
  customer: { name: " Ana ", email: "ana@example.invalid" },
  pickupTime: "2026-10-26T17:30:00Z",
  lines: [{ sizeId: "rice", quantity: 2, instructions: "No onions" }],
  ...changes,
});
const jsonRequest = (payload, headers = {}) => new Request("https://fsx.example/api/orders", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
});

function application({ now = "2026-10-26T17:00:00Z", changeMenu = () => {}, insertError = null } = {}) {
  // Freeze only the application clock. No requests reach Supabase or Stripe.
  class Clock extends Date {
    constructor(value) { super(value === undefined ? now : value); }
    static now() { return Date.parse(now); }
  }
  const hours = loadModule(new URL("../lib/hours.ts", import.meta.url), {}, { Date: Clock });
  const makeItem = (code, id, priceCents, extra = {}) => ({
    id: `item-${code}`, code, name: `${code} menu name`, description: "", isActive: true,
    isAvailable: true, isSpicyFlag: false, isCatering: false,
    sizes: [{ id, name: "regular", priceCents }], ...extra,
  });
  const items = [
    makeItem("R1", "rice", 750), makeItem("G1", "combo", 1299),
    makeItem("G2", "half2", 1000), makeItem("G5", "half5", 1000),
    makeItem("T1", "tray", 3999, { isCatering: true }), makeItem("A2", "egg-roll", 150),
  ];
  changeMenu(items);
  const saved = [];
  const stripeCalls = [];
  let reads = 0;
  const store = {
    getMenu: async () => { reads++; return [{ id: "category", name: "Menu", sortOrder: 1, items }]; },
    getSettings: async () => ({ taxRateBps: 825, leadRegularMinutes: 15, leadCateringMinutes: 40 }),
    getBusinessHours: async () => Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek, openMinutes: dayOfWeek ? 660 : null, closeMinutes: dayOfWeek ? 1260 : null,
    })),
    insertOrder: async (order, earliestPickupAt) => {
      if (insertError) throw insertError;
      saved.push({ order, earliestPickupAt });
      return { ...order, id: "order-1", orderNumber: "0042", createdAt: now, paidAt: null };
    },
    setStripeSession: async (orderId, sessionId) => { stripeCalls.push({ attached: [orderId, sessionId] }); },
    expireOrder: async () => assert.fail("valid or rejected input should not need checkout cleanup"),
  };
  const service = loadModule(new URL("../lib/orders.ts", import.meta.url), {
    "./data": { store }, "./errors": errors, "./hours": hours, "./menu-rules": rules, "./money": money,
  }, { Date: Clock });
  const endpoint = loadModule(new URL("../app/api/orders/route.ts", import.meta.url), {
    "next/server": next, "@/lib/data": { store }, "@/lib/errors": errors,
    "@/lib/orders": service, "@/lib/validation": validation,
    "@/lib/stripe": {
      stripeConfigured: () => true, siteTag: () => "test-only",
      getStripe: () => ({ checkout: { sessions: { create: async (params, options) => {
        stripeCalls.push({ params, options });
        return { id: "cs_test_example", url: "https://checkout.stripe.com/test" };
      } } } }),
    },
  }, { Date: Clock });
  return { ...endpoint, saved, stripeCalls, reads: () => reads };
}

test("submission ignores browser prices/statuses and persists server snapshots before Stripe", async () => {
  const app = application();
  const response = await app.POST(jsonRequest(input({
    totalCents: 1, taxRateBps: 0, paymentStatus: "paid", ticketStatus: "ready",
    lines: [{ sizeId: "rice", quantity: 2, unitPriceCents: 1, nameSnapshot: "Forged", instructions: "No onions" }],
  })));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Location"), "/api/orders/order-1");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const { order, earliestPickupAt } = app.saved[0];
  assert.equal(order.customerName, "Ana");
  assert.equal(order.customerPhone, null);
  assert.equal(order.paymentStatus, "pending_payment");
  assert.equal(order.ticketStatus, null);
  assert.equal(order.lines[0].unitPriceCents, 750);
  assert.equal(order.lines[0].nameSnapshot, "R1 menu name");
  assert.equal(order.lines[0].instructions, "No onions");
  assert.equal(order.subtotalCents, 1500);
  assert.equal(order.taxCents, 124);
  assert.equal(order.totalCents, 1624);
  assert.equal(earliestPickupAt, "2026-10-26T17:15:00.000Z");
  assert.equal(app.stripeCalls[0].params.line_items[0].price_data.unit_amount, 750);
  assert.equal(app.stripeCalls[0].params.line_items[1].price_data.unit_amount, 124);
  assert.equal(app.stripeCalls[0].options.idempotencyKey, "order-order-1");
  assert.deepEqual(app.stripeCalls[1].attached, ["order-1", "cs_test_example"]);
  const body = await response.json();
  assert.equal(body.totalCents, 1624);
  assert.equal(body.customerEmail, undefined);
});

for (const quantity of [0, -1, 51, 1.5, "2"]) {
  test(`invalid quantity ${JSON.stringify(quantity)} is rejected before store reads or Stripe`, async () => {
    const app = application();
    assert.equal((await app.POST(jsonRequest(input({ lines: [{ sizeId: "rice", quantity }] })))).status, 400);
    assert.equal(app.reads(), 0);
    assert.equal(app.saved.length, 0);
    assert.equal(app.stripeCalls.length, 0);
  });
}

for (const [label, changes] of [
  ["missing contact", { customer: {} }],
  ["invalid email", { customer: { name: "Ana", email: "bad" } }],
  ["long instructions", { lines: [{ sizeId: "rice", quantity: 1, instructions: "x".repeat(201) }] }],
  ["empty order", { lines: [] }],
  ["too many lines", { lines: Array.from({ length: 31 }, () => ({ sizeId: "rice", quantity: 1 })) }],
  ["invalid date", { pickupTime: "not-a-date" }],
]) {
  test(`${label} is rejected before persistence`, async () => {
    const app = application();
    assert.equal((await app.POST(jsonRequest(input(changes)))).status, 400);
    assert.equal(app.reads(), 0);
    assert.equal(app.saved.length, 0);
    assert.equal(app.stripeCalls.length, 0);
  });
}

for (const [label, changes, options, status, code] of [
  ["closed Sunday", {}, { now: "2026-10-25T17:00:00Z" }, 409, "store_closed"],
  ["too-early pickup", { pickupTime: "2026-10-26T17:14:59Z" }, {}, 422, "pickup_too_early"],
  ["pickup after closing", { pickupTime: "2026-10-27T03:30:00Z" }, {}, 422, "pickup_outside_hours"],
  ["unknown size", { lines: [{ sizeId: "unknown", quantity: 1 }] }, {}, 400, "invalid_request"],
  ["sold-out item", {}, { changeMenu: (items) => { items[0].isAvailable = false; } }, 409, "item_unavailable"],
  ["archived item", {}, { changeMenu: (items) => { items[0].isActive = false; } }, 409, "item_unavailable"],
  ["unpriced item", {}, { changeMenu: (items) => { items[0].sizes[0].priceCents = 0; } }, 400, "invalid_request"],
  ["spicy appetizer", { lines: [{ sizeId: "egg-roll", quantity: 1, spicy: true }] }, {}, 400, "invalid_request"],
]) {
  test(`${label} never writes an order or calls Stripe`, async () => {
    const app = application(options);
    const response = await app.POST(jsonRequest(input(changes)));
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
    assert.equal(app.saved.length, 0);
    assert.equal(app.stripeCalls.length, 0);
  });
}

test("mixed catering order requires 40 minutes and normalizes an offset pickup to UTC", async () => {
  const lines = [{ sizeId: "rice", quantity: 1 }, { sizeId: "tray", quantity: 1 }];
  const early = application();
  const rejected = await early.POST(jsonRequest(input({ lines, pickupTime: "2026-10-26T17:39:00Z" })));
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).error.details.leadMinutes, 40);
  assert.equal(early.saved.length, 0);
  const app = application();
  assert.equal((await app.POST(jsonRequest(input({ lines, pickupTime: "2026-10-26T12:40:00-05:00" })))).status, 201);
  assert.equal(app.saved[0].earliestPickupAt, "2026-10-26T17:40:00.000Z");
  assert.equal(app.saved[0].order.pickupTime, "2026-10-26T17:40:00.000Z");
});

test("combo halves are choices, never additional priced lines; repeats are permitted", async () => {
  const app = application();
  assert.equal((await app.POST(jsonRequest(input({
    lines: [{ sizeId: "combo", quantity: 1, components: ["G2", "G2"] }],
  })))).status, 201);
  assert.equal(app.saved[0].order.lines.length, 1);
  assert.equal(app.saved[0].order.subtotalCents, 1299);
});

for (const code of ["G7", "G8"]) {
  test(`${code} cannot become a combo choice even if it accidentally appears in menu data`, async () => {
    const app = application({ changeMenu: (items) => { items.push({ ...items[2], code }); } });
    assert.equal((await app.POST(jsonRequest(input({
      lines: [{ sizeId: "combo", quantity: 1, components: ["G2", code] }],
    })))).status, 400);
    assert.equal(app.saved.length, 0);
  });
}

for (const [label, lines, changeMenu, status] of [
  ["missing half", [{ sizeId: "combo", quantity: 1, components: ["G2"] }], () => {}, 400],
  ["components on rice", [{ sizeId: "rice", quantity: 1, components: ["G2", "G5"] }], () => {}, 400],
  ["sold-out half", [{ sizeId: "combo", quantity: 1, components: ["G2", "G5"] }], (items) => { items[2].isAvailable = false; }, 409],
]) {
  test(`invalid combo: ${label}`, async () => {
    const app = application({ changeMenu });
    assert.equal((await app.POST(jsonRequest(input({ lines })))).status, status);
    assert.equal(app.saved.length, 0);
    assert.equal(app.stripeCalls.length, 0);
  });
}

for (const [status, code] of [[409, "checkout_conflict"], [503, "database_unavailable"]]) {
  test(`storage failure ${status} cannot start a Stripe session`, async () => {
    const app = application({ insertError: new errors.ApiError(status, code, "Refresh and retry.") });
    const response = await app.POST(jsonRequest(input()));
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(app.saved.length, 0);
    assert.equal(app.stripeCalls.length, 0);
  });
}

test("non-JSON media types and malformed JSON are rejected before persistence", async () => {
  for (const [contentType, body, status] of [["text/plain", "{}", 415], ["application/json", "{", 400]]) {
    const app = application();
    const response = await app.POST(new Request("https://fsx.example/api/orders", {
      method: "POST", headers: { "Content-Type": contentType }, body,
    }));
    assert.equal(response.status, status);
    assert.equal(app.reads(), 0);
    assert.equal(app.stripeCalls.length, 0);
  }
});

test("declared oversized body is rejected without reading it", async () => {
  const app = application();
  let reads = 0;
  const response = await app.POST({
    headers: new Headers({ "Content-Type": "application/json", "Content-Length": "65537" }),
    get body() { reads++; throw new Error("Body must not be read"); },
  });
  assert.equal(response.status, 413);
  assert.equal(reads, 0);
  assert.equal(app.reads(), 0);
});

test("chunked body limit counts actual bytes even when Content-Length understates it", async () => {
  for (const contentLength of [null, "1"]) {
    const app = application();
    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(32769).fill(32)); },
      cancel() { cancelled = true; },
    });
    const headers = new Headers({ "Content-Type": "application/json" });
    if (contentLength) headers.set("Content-Length", contentLength);
    const response = await app.POST({ headers, body: stream });
    assert.equal(response.status, 413);
    assert.equal(cancelled, true);
    assert.equal(app.reads(), 0);
  }
});

test("invalid UTF-8 and interrupted uploads are controlled 400 responses", async () => {
  for (const stream of [
    new ReadableStream({ start(c) { c.enqueue(new Uint8Array([0xff])); c.close(); } }),
    new ReadableStream({ start(c) { c.error(new Error("Upload disconnected")); } }),
  ]) {
    const app = application();
    const response = await app.POST({ headers: new Headers({ "Content-Type": "application/json" }), body: stream });
    assert.equal(response.status, 400);
    assert.equal(app.reads(), 0);
  }
});

test("exact-limit JSON and a multibyte character split across chunks decode correctly", async () => {
  const app = application();
  const encoded = new TextEncoder().encode(JSON.stringify(input({ customer: { name: "José", email: "jose@example.invalid" } })));
  const bytes = new Uint8Array(validation.MAX_JSON_BODY_BYTES).fill(32);
  bytes.set(encoded);
  const accent = bytes.indexOf(0xc3);
  const response = await app.POST({
    headers: new Headers({ "Content-Type": "Application/JSON; charset=utf-8" }),
    body: new ReadableStream({ start(c) {
      c.enqueue(bytes.slice(0, accent + 1)); c.enqueue(bytes.slice(accent + 1)); c.close();
    } }),
  });
  assert.equal(response.status, 201);
  assert.equal(app.saved[0].order.customerName, "José");
});
