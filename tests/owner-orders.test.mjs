import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const next = require("next/server");
const zod = require("zod");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });
const ticket = loadModule(new URL("../lib/ticket.ts", import.meta.url), {});
const views = loadModule(new URL("../lib/views.ts", import.meta.url), {});
const query = loadModule(new URL("../lib/owner-order-query.ts", import.meta.url), {
  zod, "./ticket": ticket,
}, { URLSearchParams });
const money = loadModule(new URL("../lib/money.ts", import.meta.url), {});
const ui = loadModule(new URL("../lib/ui.ts", import.meta.url), {});
const CancelOrderButton = loadModule(new URL("../app/owner/orders/[id]/cancel-order-button.tsx", import.meta.url), {
  "react/jsx-runtime": jsx, react: require("react"),
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "@/lib/cancel-order": { cancelOrder: async () => {} }, "@/lib/ui": ui,
}).default;
const id = "a14be811-d8c1-4c80-9fc1-80affd110116";
const order = {
  id, orderNumber: "0042", customerName: "Ana <Torres>", customerEmail: "ana@example.com",
  customerPhone: null, paymentStatus: "paid", ticketStatus: "cancelled",
  paidAt: "2026-10-26T16:00:00.000Z", createdAt: "2026-10-26T15:58:00.000Z",
  pickupTime: "2026-10-26T17:00:00.000Z", subtotalCents: 2598, taxCents: 214,
  totalCents: 2812, taxRateBps: 825, stripeSessionId: "cs_test_reference",
  lines: [{ sizeId: "size", itemCode: "G1", nameSnapshot: "Original combination plate",
    sizeName: "regular", unitPriceCents: 1299, quantity: 2, spicy: true,
    instructions: "<script>do not execute</script>", components: ["G2", "G5"] }],
};

function setup({ role = "owner", user = { id: "user" }, roleError = null, found = order, orders = [order], total = orders.length } = {}) {
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, active: true }, error: roleError }) }) }) }),
  };
  const auth = loadModule(new URL("../lib/auth.ts", import.meta.url), {
    "./errors": errors, "./data/mode": { usingStub: () => false },
    "./supabase/server": { createClient: async () => db },
  });
  const service = loadModule(new URL("../lib/owner-orders.ts", import.meta.url), {
    zod, "./auth": auth, "./errors": errors, "./views": views, "./owner-order-query": query,
    "./data": { store: {
      listOrders: async (filters) => { calls.push(filters); return { orders, total }; },
      getOrder: async (value) => { calls.push(value); return found; },
    } },
  });
  const endpoint = loadModule(new URL("../app/api/owner/orders/route.ts", import.meta.url), {
    "next/server": next, "@/lib/errors": errors, "@/lib/owner-orders": service,
  }, { URL });
  return { calls, service, auth, ...endpoint };
}
const request = (suffix = "") => new Request(`https://fsx.example/api/owner/orders${suffix}`, { headers: { "x-stub-role": "owner" } });

for (const [options, status] of [[{ user: null }, 401], [{ role: "staff" }, 403], [{ roleError: { code: "unavailable" } }, 503]]) {
  test(`owner reads are denied with ${status} before any store access`, async () => {
    const endpoint = setup(options);
    const response = await endpoint.GET(request());
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    await assert.rejects(endpoint.service.getOwnerOrder(request(), id), (error) => error.status === status);
    assert.equal(endpoint.calls.length, 0);
  });
}

test("owner API normalizes date offsets, order-number search and pagination", async () => {
  const endpoint = setup();
  const response = await endpoint.GET(request("?q=%230042&status=cancelled&from=2026-10-26T00:00:00-05:00&to=2026-10-27T00:00:00-05:00&page=2&pageSize=25"));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.page, 2);
  assert.equal(data.orders[0].itemCount, 2);
  assert.equal(data.orders[0].lines[0].name, "Original combination plate");
  assert.equal(endpoint.calls[0].q, "0042");
  assert.equal(endpoint.calls[0].ticketStatus, "cancelled");
  assert.equal(endpoint.calls[0].from, "2026-10-26T05:00:00.000Z");
  assert.equal(endpoint.calls[0].to, "2026-10-27T05:00:00.000Z");
});

for (const filters of ["?page=0", "?page=1&page=2", "?status=refunded", "?pageSize=101", "?page=9007199254740991", "?from=no", "?from=2026-10-27T00:00:00Z&to=2026-10-26T00:00:00Z", `?q=${"a".repeat(101)}`]) {
  test(`invalid owner filters do not reach the store: ${filters.slice(0, 60)}`, async () => {
    const endpoint = setup();
    assert.equal((await endpoint.GET(request(filters))).status, 400);
    assert.equal(endpoint.calls.length, 0);
  });
}

test("calendar filters include whole Central days across both DST transitions", () => {
  const spring = query.ownerHistoryQuerySchema.parse({ start: "2026-03-08", end: "2026-03-08" });
  assert.equal(spring.from, "2026-03-08T06:00:00.000Z");
  assert.equal(spring.to, "2026-03-09T05:00:00.000Z");
  const fall = query.ownerHistoryQuerySchema.parse({ start: "2026-11-01", end: "2026-11-01" });
  assert.equal(fall.from, "2026-11-01T05:00:00.000Z");
  assert.equal(fall.to, "2026-11-02T06:00:00.000Z");
  for (const raw of [{ start: "2026-02-30" }, { start: "2026-10-27", end: "2026-10-26" }, { q: ["a", "b"] }, { start: ["2026-10-26"] }]) {
    assert.equal(query.ownerHistoryQuerySchema.safeParse(raw).success, false);
  }
  assert.equal(query.ownerHistoryQuerySchema.parse({ start: "", end: "", status: "", q: "" }).pageSize, 25);
});

test("missing, malformed and unpaid order details return 404", async () => {
  for (const found of [null, { ...order, paymentStatus: "pending_payment" }, { ...order, paymentStatus: "expired" }]) {
    await assert.rejects(setup({ found }).service.getOwnerOrder(request(), id), (error) => error.status === 404);
  }
  const endpoint = setup();
  await assert.rejects(endpoint.service.getOwnerOrder(request(), "invalid"), (error) => error.status === 404);
  assert.equal(endpoint.calls.length, 0);
});

test("stub filters paid orders before counting/paginating, with deterministic equal-time ties", async () => {
  const { stubStore } = loadModule(new URL("../lib/data/stub.ts", import.meta.url), { "./menu": { menuFixture: [] } }, { crypto: globalThis.crypto });
  const rows = [];
  for (let index = 0; index < 28; index++) {
    const row = await stubStore.insertOrder({ ...order, customerName: index < 27 ? "Ana" : "Other", paymentStatus: "pending_payment", ticketStatus: null });
    await stubStore.setStripeSession(row.id, `cs_${index}`);
    if (index !== 26) {
      await stubStore.markPaid(row.id, `cs_${index}`);
      row.paidAt = order.paidAt;
      await stubStore.setTicketStatus(row.id, "cancelled");
      if (index < 26) rows.push(row);
    }
  }
  const filters = { page: 2, pageSize: 25, q: "ana", ticketStatus: "cancelled", from: order.paidAt, to: "2026-10-27T00:00:00Z" };
  const result = await stubStore.listOrders(filters);
  assert.equal(result.total, 26);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].id, rows.sort((a, b) => a.id.localeCompare(b.id))[25].id);
  assert.equal((await stubStore.listOrders({ ...filters, from: undefined, to: order.paidAt })).total, 0);
});

function navigationSignal(kind, target) { return Object.assign(new Error(kind), { kind, target }); }
const navigation = {
  redirect: (target) => { throw navigationSignal("redirect", target); },
  notFound: () => { throw navigationSignal("notFound"); },
};
const link = { default: ({ href, children, ...props }) => jsx.jsx("a", { href, ...props, children }) };
const orderUi = loadModule(new URL("../app/owner/orders/order-ui.tsx", import.meta.url), {
  "react/jsx-runtime": jsx, "next/link": link, "next/navigation": navigation, "@/lib/errors": errors,
});
function page(endpoint, detail = false) {
  return loadModule(new URL(detail ? "../app/owner/orders/[id]/page.tsx" : "../app/owner/orders/page.tsx", import.meta.url), {
    "react/jsx-runtime": jsx, "next/link": link, "next/headers": { headers: async () => request().headers },
    "@/lib/owner-orders": endpoint.service, "@/lib/owner-order-query": query,
    "@/lib/money": money, "@/lib/ui": ui,
    "./cancel-order-button": { default: CancelOrderButton },
    [detail ? "../order-ui" : "./order-ui"]: orderUi,
  }).default;
}

test("history page renders protected summaries and preserves filters in detail/page links", async () => {
  const html = renderToStaticMarkup(await page(setup({ total: 26 }))({ searchParams: Promise.resolve({ q: "Ana", status: "cancelled" }) }));
  assert.match(html, /Ana &lt;Torres&gt;/);
  assert.match(html, /Cancelled/);
  assert.match(html, /page=2/);
  assert.match(html, new RegExp(`/owner/orders/${id}\\?q=Ana&amp;status=cancelled`));
  assert.doesNotMatch(html, /ana@example.com|cs_test_reference|<script>/);
});

test("detail page renders historical snapshots, escapes instructions, and preserves list return", async () => {
  const html = renderToStaticMarkup(await page(setup(), true)({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ q: "Ana", page: "2", redirect: "https://evil.example" }) }));
  for (const text of [/Original combination plate/, /\$12\.99 each/, /\$28\.12/, /Not provided/, /G2 \+ G5/, /Spicy requested/, /cs_test_reference/, /q=Ana&amp;page=2/]) assert.match(html, text);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|evil.example/);
  assert.doesNotMatch(html, /Cancel order<\/button>/);
});

test("all retained orders remain visible without an automatic six-month cutoff", async () => {
  const oldOrder = { ...order, paidAt: "2024-01-02T18:00:00.000Z", createdAt: "2024-01-02T17:58:00.000Z" };
  const endpoint = setup({ orders: [oldOrder], found: oldOrder });
  const html = renderToStaticMarkup(await page(endpoint)({ searchParams: Promise.resolve({}) }));
  assert.match(html, /2024/);
  assert.equal(endpoint.calls[0].from, undefined);
  assert.equal(endpoint.calls[0].to, undefined);
  assert.match(renderToStaticMarkup(await page(endpoint, true)({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) })), /2024/);
  const { stubStore } = loadModule(new URL("../lib/data/stub.ts", import.meta.url), { "./menu": { menuFixture: [] } }, { crypto: globalThis.crypto });
  const row = await stubStore.insertOrder(oldOrder);
  await stubStore.setStripeSession(row.id, "cs_old");
  await stubStore.markPaid(row.id, "cs_old");
  row.paidAt = oldOrder.paidAt;
  assert.equal((await stubStore.listOrders({ page: 1, pageSize: 25 })).orders[0].id, row.id);
});

test("detail offers cancellation for completed paid tickets with a separate confirmation step", async () => {
  const html = renderToStaticMarkup(await page(setup({ found: { ...order, ticketStatus: "completed" } }), true)({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
  assert.match(html, /Cancel order<\/button>/);
  assert.match(html, /does not issue a refund/);
  assert.doesNotMatch(html, /Confirm cancellation<\/button>/);
});

const validation = loadModule(new URL("../lib/validation.ts", import.meta.url), { zod, "./errors": errors }, { TextDecoder });
function ticketEndpoint(options) {
  const { auth } = setup(options);
  const changes = [];
  return { changes, ...loadModule(new URL("../app/api/orders/[id]/ticket/route.ts", import.meta.url), {
    "next/server": next, "@/lib/auth": auth, "@/lib/errors": errors,
    "@/lib/ticket": ticket, "@/lib/validation": validation,
    "@/lib/data": { store: {
      getOrder: async () => options.found ?? order,
      setTicketStatus: async (orderId, status) => { changes.push({ orderId, status }); return { ...order, ticketStatus: status }; },
    } },
  }) };
}
const cancelRequest = () => new Request(`https://fsx.example/api/orders/${id}/ticket`, {
  method: "PATCH", headers: { "Content-Type": "application/json", "x-stub-role": "owner" },
  body: JSON.stringify({ status: "cancelled" }),
});

test("existing ticket API allows owner cancellation from every non-cancelled paid state", async () => {
  for (const status of ["received", "in_progress", "ready", "completed"]) {
    const endpoint = ticketEndpoint({ found: { ...order, ticketStatus: status } });
    const response = await endpoint.PATCH(cancelRequest(), { params: Promise.resolve({ id }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ticketStatus, "cancelled");
    assert.equal(endpoint.changes[0].status, "cancelled");
    assert.equal(order.paymentStatus, "paid");
  }
});

for (const [options, status] of [
  [{ user: null }, 401], [{ role: "staff", found: { ...order, ticketStatus: "ready" } }, 403],
  [{ found: order }, 409], [{ found: { ...order, paymentStatus: "pending_payment", ticketStatus: null } }, 409],
]) {
  test(`cancellation rejects unauthorized or invalid transitions (${status}) without a write`, async () => {
    const endpoint = ticketEndpoint(options);
    assert.equal((await endpoint.PATCH(cancelRequest(), { params: Promise.resolve({ id }) })).status, status);
    assert.equal(endpoint.changes.length, 0);
  });
}

test("cancellation client changes only the ticket and waits for a matching success response", async () => {
  const calls = [];
  const client = loadModule(new URL("../lib/cancel-order.ts", import.meta.url), {}, { fetch: async (url, options) => {
    calls.push({ url, options }); return Response.json({ orderId: id, ticketStatus: "cancelled" });
  } });
  await client.cancelOrder(id);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `/api/orders/${id}/ticket`);
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.body, JSON.stringify({ status: "cancelled" }));
  for (const status of [401, 403, 404, 409, 500]) {
    const failed = loadModule(new URL("../lib/cancel-order.ts", import.meta.url), {}, { fetch: async () => new Response("private server details", { status }) });
    await assert.rejects(failed.cancelOrder(id), (error) => !error.message.includes("private server details"));
  }
  const mismatch = loadModule(new URL("../lib/cancel-order.ts", import.meta.url), {}, { fetch: async () => Response.json({ orderId: id, ticketStatus: "ready" }) });
  await assert.rejects(mismatch.cancelOrder(id), /Could not confirm cancellation/);
  const offline = loadModule(new URL("../lib/cancel-order.ts", import.meta.url), {}, { fetch: async () => { throw new Error("private network details"); } });
  await assert.rejects(offline.cancelOrder(id), /Check your connection/);
});

test("direct page visits deny staff and redirect anonymous callers without reading orders", async () => {
  for (const detail of [false, true]) {
    const endpoint = setup({ role: "staff" });
    const props = { params: Promise.resolve({ id }), searchParams: Promise.resolve({}) };
    assert.match(renderToStaticMarkup(await page(endpoint, detail)(props)), /Owner access required/);
    assert.equal(endpoint.calls.length, 0);
    await assert.rejects(page(setup({ user: null }), detail)(props), (error) => error.kind === "redirect" && error.target === "/login");
  }
});

test("history offers useful empty, invalid-filter and out-of-range states", async () => {
  assert.match(renderToStaticMarkup(await page(setup({ orders: [] }))({ searchParams: Promise.resolve({}) })), /No orders match/);
  assert.match(renderToStaticMarkup(await page(setup({ orders: [], total: 1 }))({ searchParams: Promise.resolve({ page: "2" }) })), /Go to the first page/);
  const endpoint = setup();
  assert.match(renderToStaticMarkup(await page(endpoint)({ searchParams: Promise.resolve({ page: "-1" }) })), /Check your filters/);
  assert.equal(endpoint.calls.length, 0);
});
