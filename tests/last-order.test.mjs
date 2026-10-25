import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { parseLastOrder, msUntilExpiry } = loadModule(new URL("../lib/last-order.ts", import.meta.url), {});

const NOW = 1_800_000_000_000;
const ID = "3f3b44d4-7d22-8138-9cd4-ccae4cba71ef";
const stored = (over = {}) => JSON.stringify({ id: ID, orderNumber: "0042", savedAt: NOW - 60_000, ...over });

test("reads a recent order", () => {
  const order = parseLastOrder(stored(), NOW);
  assert.equal(order.id, ID);
  assert.equal(order.orderNumber, "0042");
  assert.equal(order.savedAt, NOW - 60_000);
});

test("ignores an order older than 12 hours", () => {
  assert.equal(parseLastOrder(stored({ savedAt: NOW - 13 * 3600_000 }), NOW), null);
  assert.notEqual(parseLastOrder(stored({ savedAt: NOW - 11 * 3600_000 }), NOW), null);
});

test("ignores empty, malformed or non-object storage", () => {
  assert.equal(parseLastOrder(null, NOW), null);
  assert.equal(parseLastOrder("", NOW), null);
  assert.equal(parseLastOrder("not json", NOW), null);
  assert.equal(parseLastOrder("42", NOW), null);
});

test("ignores a tampered id or order number so it can never become a strange link", () => {
  assert.equal(parseLastOrder(stored({ id: "../../admin" }), NOW), null);
  assert.equal(parseLastOrder(stored({ id: ID + "/x" }), NOW), null);
  assert.equal(parseLastOrder(stored({ orderNumber: "<b>1</b>" }), NOW), null);
  assert.equal(parseLastOrder(stored({ orderNumber: 42 }), NOW), null);
});

test("ignores a save time in the future", () => {
  assert.equal(parseLastOrder(stored({ savedAt: NOW + 3600_000 }), NOW), null);
});

test("msUntilExpiry counts down to the 12 hour mark and never goes negative", () => {
  const order = { id: ID, orderNumber: "0042", savedAt: NOW - 11 * 3600_000 };
  assert.equal(msUntilExpiry(order, NOW), 3600_000);
  assert.equal(msUntilExpiry({ ...order, savedAt: NOW - 20 * 3600_000 }, NOW), 0);
});

test("an order is gone exactly at the 12 hour mark, not a moment later", () => {
  const exactly = JSON.stringify({ id: ID, orderNumber: "0042", savedAt: NOW - 12 * 3600_000 });
  const justBefore = JSON.stringify({ id: ID, orderNumber: "0042", savedAt: NOW - 12 * 3600_000 + 1 });
  assert.equal(parseLastOrder(exactly, NOW), null);
  assert.notEqual(parseLastOrder(justBefore, NOW), null);
  assert.equal(msUntilExpiry({ id: ID, orderNumber: "0042", savedAt: NOW - 12 * 3600_000 }, NOW), 0);
});
