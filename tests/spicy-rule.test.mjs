import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Load real TypeScript source files with only their outside boundaries replaced (same approach
// as checkout-session.test.mjs). Relative imports inside lib/ are loaded for real.
function load(path, mocks = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  const wrapper = vm.runInNewContext(
    `(function(require, module, exports) { ${compiled}\n})`,
    {
      process,
      console,
      Intl,
      Date,
    },
  );
  wrapper(
    (name) => {
      if (name in mocks) return mocks[name];
      if (name === "next/server") return require("next/server");
      if (name.startsWith("./"))
        return load(`../lib/${name.slice(2)}.ts`, mocks);
      throw new Error(`Unexpected dependency: ${name}`);
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const { allowsSpicy } = load("../lib/menu-rules.ts");

test("spicy is allowed on G, C, T and every fried rice, including steamed rice", () => {
  for (const code of [
    "G1",
    "G2",
    "G10",
    "C1",
    "C19",
    "C21",
    "T1",
    "T3",
    "R1",
    "R4",
    "R6",
  ]) {
    assert.equal(allowsSpicy(code), true, code);
  }
});

test("spicy is not allowed on appetizers (incl. wings), soups or drinks", () => {
  for (const code of ["A1", "A2", "A3", "A4", "S1", "S3", "B1"]) {
    assert.equal(allowsSpicy(code), false, code);
  }
});

test("anything that is not a menu code is rejected", () => {
  for (const code of ["", "g1", "GG", "G", "R", "X9", "A3 ", "G1;"]) {
    assert.equal(allowsSpicy(code), false, JSON.stringify(code));
  }
});

// --- the real order check, against a tiny in-memory menu ---
const size = (id, priceCents) => ({ id, name: "regular", priceCents });
const item = (code, name, sizeId, extra = {}) => ({
  id: `it_${code}`,
  code,
  name,
  description: "",
  isActive: true,
  isAvailable: true,
  isSpicyFlag: false,
  isCatering: false,
  sizes: [size(sizeId, 1000)],
  ...extra,
});
const menu = [
  {
    id: "c",
    name: "All",
    sortOrder: 1,
    items: [
      item("A2", "Egg Roll", "sz_a2"),
      item("A3", "Fried Chicken Wings", "sz_a3"),
      item("A4", "Chicken Wings with French Fries", "sz_a4"),
      item("S1", "Hot and Sour Soup", "sz_s1"),
      item("B1", "Soft Drink or Iced Tea", "sz_b1"),
      item("G2", "Gen Joe's Chicken", "sz_g2"),
      item("R4", "Steamed Rice", "sz_r4"),
      item("C19", "Panda Pak", "sz_c19"),
      item("T1", "Chicken Fried Rice Tray", "sz_t1", { isCatering: true }),
    ],
  },
];
const openAllWeek = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  openMinutes: 0,
  closeMinutes: 1440,
}));
const inserted = [];
const store = {
  async getMenu() {
    return menu;
  },
  async getSettings() {
    return { taxRateBps: 825, leadRegularMinutes: 15, leadCateringMinutes: 40 };
  },
  async getBusinessHours() {
    return openAllWeek;
  },
  async insertOrder(order) {
    inserted.push(order);
    return {
      id: "o1",
      orderNumber: "0001",
      createdAt: "x",
      paidAt: null,
      ...order,
    };
  },
};
const { createPendingOrder } = load("../lib/orders.ts", {
  "./data": { store },
});

const now = new Date("2026-10-21T17:00:00Z");
const later = new Date(now.getTime() + 2 * 3600e3).toISOString();
const order = (sizeId, spicy) => ({
  customer: { name: "T", email: "t@example.invalid" },
  pickupTime: later,
  lines: [{ sizeId, quantity: 1, spicy }],
});

for (const [sizeId, label] of [
  ["sz_a2", "Egg Roll"],
  ["sz_a3", "Fried Chicken Wings"],
  ["sz_a4", "Wings with French Fries"],
  ["sz_s1", "Hot and Sour Soup"],
  ["sz_b1", "Soft Drink"],
]) {
  test(`server rejects spicy on ${label}`, async () => {
    inserted.length = 0;
    await assert.rejects(
      () => createPendingOrder(order(sizeId, true), now),
      (e) =>
        e.status === 400 &&
        e.code === "invalid_request" &&
        /can't be made spicy/.test(e.message),
    );
    assert.equal(inserted.length, 0, "nothing may be saved");
  });
}

for (const [sizeId, label] of [
  ["sz_g2", "an entrée"],
  ["sz_r4", "Steamed Rice"],
  ["sz_c19", "the Panda Pak"],
  ["sz_t1", "a catering tray"],
]) {
  test(`server accepts spicy on ${label}`, async () => {
    inserted.length = 0;
    const { order: saved } = await createPendingOrder(order(sizeId, true), now);
    assert.equal(saved.lines[0].spicy, true);
    assert.equal(inserted.length, 1);
  });
}

test("a plain (non-spicy) order of a non-spicy item still works", async () => {
  const { order: saved } = await createPendingOrder(order("sz_a2", false), now);
  assert.equal(saved.lines[0].spicy, false);
});
