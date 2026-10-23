import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { allergenNotice } = loadModule(new URL("../lib/allergens.ts", import.meta.url), {});

test("finds the peanut warning in the Tri Kung Pao description", () => {
  assert.equal(
    allergenNotice("Chicken, shrimp and beef with peanuts. Served with rice. Contains peanuts."),
    "Contains peanuts",
  );
});

test("keeps a longer allergen list whole", () => {
  assert.equal(allergenNotice("Fried in oil. Contains peanuts and shellfish. Served hot."), "Contains peanuts and shellfish");
});

test("returns null when there is no warning", () => {
  assert.equal(allergenNotice("Chicken with mushrooms. Served with rice."), null);
  assert.equal(allergenNotice(""), null);
  assert.equal(allergenNotice(null), null);
  assert.equal(allergenNotice(undefined), null);
});

test("does not treat a negative statement as a warning", () => {
  assert.equal(allergenNotice("Does not contain peanuts."), null);
});

test("still finds the warning when it is the last words with no full stop", () => {
  assert.equal(allergenNotice("Chicken with peanuts. Contains peanuts"), "Contains peanuts");
  assert.equal(allergenNotice("Contains peanuts; served hot"), "Contains peanuts");
});
