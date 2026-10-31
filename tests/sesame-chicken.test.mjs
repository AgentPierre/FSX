import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { menuFixture } = loadModule(new URL("../lib/data/menu.ts", import.meta.url), {});
const { allowsSpicy } = loadModule(new URL("../lib/menu-rules.ts", import.meta.url), {});
const { allergenNotice } = loadModule(new URL("../lib/allergens.ts", import.meta.url), {});

const items = menuFixture.flatMap((category) => category.items);
const sesame = items.find((item) => item.code === "G11");

test("G11 Sesame Chicken is a $12.99 Gen Joe's Special with one regular size", () => {
  assert.ok(sesame, "G11 is missing from the fixture");
  assert.equal(sesame.name, "Sesame Chicken");
  assert.equal(menuFixture.find((category) => category.items.includes(sesame)).name, "Gen Joe's Specials");
  assert.equal(sesame.sizes.length, 1);
  assert.equal(sesame.sizes[0].priceCents, 1299);
  assert.ok(sesame.isActive && sesame.isAvailable && !sesame.isCatering);
});

test("it can be made spicy and shows a sesame allergen badge", () => {
  assert.equal(allowsSpicy("G11"), true);
  assert.equal(allergenNotice(sesame.description), "Contains sesame");
});

test("the menu has 47 unique codes, and G7 and G8 are still absent", () => {
  const codes = items.map((item) => item.code);
  assert.equal(codes.length, 47);
  assert.equal(new Set(codes).size, 47);
  assert.ok(!codes.includes("G7") && !codes.includes("G8"));
});
