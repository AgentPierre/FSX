import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { MENU_PHOTOS } = loadModule(new URL("../lib/menu-photos.ts", import.meta.url), {});
const photoDir = new URL("../public/menu/", import.meta.url);
const menuCodes = new Set(
  readFileSync(new URL("../docs/menu.csv", import.meta.url), "utf8").split("\n").slice(1).map((line) => line.split(",")[0]),
);

test("every registered photo is a real menu code with a file under 300 KB", () => {
  assert.ok(MENU_PHOTOS.size > 0);
  for (const code of MENU_PHOTOS) {
    assert.ok(menuCodes.has(code), `${code} is not on the menu`);
    const file = new URL(`${code}.jpg`, photoDir);
    assert.ok(existsSync(file), `public/menu/${code}.jpg is missing`);
    assert.ok(statSync(file).size < 300_000, `public/menu/${code}.jpg is over 300 KB`);
  }
});

test("every photo file in public/menu is registered, so it is not silently ignored", () => {
  for (const name of readdirSync(photoDir)) {
    assert.ok(MENU_PHOTOS.has(name.replace(/\.jpg$/, "")), `${name} is not listed in lib/menu-photos.ts`);
  }
});
