import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { cartReducer, sameSelection, MAX_QUANTITY } = loadModule(
  new URL("../lib/cart.ts", import.meta.url),
  { "./menu-rules": { allowsSpicy: (code) => /^(G|C|T|R)\d+$/.test(code) } },
);

const menu = [{
  id: "c1", name: "Food", sortOrder: 1,
  items: [{
    id: "i1", code: "A2", name: "Egg Roll", isActive: true, isAvailable: true, isCatering: false,
    sizes: [{ id: "s1", name: "regular", priceCents: 150 }],
  }, {
    id: "i2", code: "R1", name: "Fried Rice", isActive: true, isAvailable: true, isCatering: false,
    sizes: [{ id: "s2", name: "sm", priceCents: 750 }, { id: "s3", name: "lg", priceCents: 1190 }],
  }],
}];
const sel = (sizeId, extra = {}) => ({ sizeId, quantity: 1, spicy: false, instructions: "", components: [], ...extra });
const add = (state, selection, id) => cartReducer(state, { type: "save", line: { id, ...selection }, menu, editing: false });
const start = { lines: [], ready: true, message: "" };

test("adding the identical selection raises the quantity instead of adding a line", () => {
  let state = add(start, sel("s1"), "a");
  state = add(state, sel("s1", { quantity: 2 }), "b");
  assert.equal(state.lines.length, 1);
  assert.equal(state.lines[0].id, "a");
  assert.equal(state.lines[0].quantity, 3);
  assert.equal(state.message, "Item added to cart.");
});

test("a different size, spicy choice or note stays a separate line", () => {
  let state = add(start, sel("s2"), "a");
  state = add(state, sel("s3"), "b");
  state = add(state, sel("s2", { spicy: true }), "c");
  state = add(state, sel("s2", { instructions: "no peas" }), "d");
  assert.equal(state.lines.length, 4);
});

test("merging past the maximum quantity is refused and changes nothing", () => {
  const state = add(start, sel("s1", { quantity: MAX_QUANTITY }), "a");
  const after = add(state, sel("s1"), "b");
  assert.equal(after.lines.length, 1);
  assert.equal(after.lines[0].quantity, MAX_QUANTITY);
  assert.match(after.message, /between 1 and 50/);
});

test("editing a line still replaces it in place", () => {
  const state = add(start, sel("s1"), "a");
  const edited = cartReducer(state, { type: "save", line: { id: "a", ...sel("s1", { quantity: 5 }) }, menu, editing: true });
  assert.equal(edited.lines.length, 1);
  assert.equal(edited.lines[0].quantity, 5);
  assert.equal(edited.message, "Cart item updated.");
});

test("sameSelection compares half orders in order", () => {
  assert.equal(sameSelection(sel("s1", { components: ["G2", "G3"] }), sel("s1", { components: ["G2", "G3"] })), true);
  assert.equal(sameSelection(sel("s1", { components: ["G2", "G3"] }), sel("s1", { components: ["G3", "G2"] })), false);
});
