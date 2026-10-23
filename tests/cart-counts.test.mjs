import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { linesForItem, quantityOf, quantityByCategory } = loadModule(
  new URL("../lib/cart-counts.ts", import.meta.url),
  {},
);

const size = (id) => ({ id, name: "regular", priceCents: 100 });
const egg = { id: "i1", code: "A2", sizes: [size("s1")] };
const rice = { id: "i2", code: "R1", sizes: [size("s2"), size("s3")] };
const soup = { id: "i3", code: "S1", sizes: [size("s4")] };
const menu = [
  { id: "c1", items: [egg] },
  { id: "c2", items: [rice] },
  { id: "c3", items: [soup] },
];
const line = (id, sizeId, quantity) => ({ id, sizeId, quantity });

test("linesForItem finds every line of an item, whatever its size", () => {
  const lines = [line("a", "s2", 1), line("b", "s1", 2), line("c", "s3", 3)];
  assert.deepEqual(linesForItem(lines, rice).map((l) => l.id), ["a", "c"]);
  assert.deepEqual(linesForItem(lines, egg).map((l) => l.id), ["b"]);
  assert.deepEqual(linesForItem(lines, soup), []);
});

test("quantityOf adds up quantities, and is 0 for no lines", () => {
  assert.equal(quantityOf([line("a", "s2", 1), line("c", "s3", 3)]), 4);
  assert.equal(quantityOf([]), 0);
});

test("quantityByCategory counts per category and leaves empty ones out", () => {
  const counts = quantityByCategory([line("a", "s2", 1), line("b", "s1", 2), line("c", "s3", 3)], menu);
  assert.equal(counts.get("c1"), 2);
  assert.equal(counts.get("c2"), 4);
  assert.equal(counts.has("c3"), false);
});

test("a line whose size is no longer on the menu counts toward no category", () => {
  assert.equal(quantityByCategory([line("z", "gone", 5)], menu).size, 0);
});
