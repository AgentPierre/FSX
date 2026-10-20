import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const next = require("next/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });

test("menu returns current sold-out flags and prices without a cache", async () => {
  const categories = [{ id: "category", name: "Rice", sortOrder: 1, items: [{
    id: "item", code: "R1", name: "Rice", description: "", isAvailable: false, isActive: true,
    isSpicyFlag: false, isCatering: false, sizes: [{ id: "size", name: "sm", priceCents: 750 }],
  }] }];
  const { GET } = loadModule(new URL("../app/api/menu/route.ts", import.meta.url), {
    "next/server": next, "@/lib/errors": errors,
    "@/lib/data": { store: { getMenu: async () => categories } },
  });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { categories });
});

test("menu database failure returns the standard error, never fixture data", async () => {
  const { GET } = loadModule(new URL("../app/api/menu/route.ts", import.meta.url), {
    "next/server": next, "@/lib/errors": errors,
    "@/lib/data": { store: { getMenu: async () => {
      throw new errors.ApiError(503, "database_unavailable", "Menu unavailable.");
    } } },
  });
  const response = await GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: { code: "database_unavailable", message: "Menu unavailable." } });
});

// Use real requireRole logic, replacing only Supabase Auth/database and data-mode boundaries.
function currentUser({ user = { id: "auth-user" }, role = "staff", roleError = null } = {}) {
  let roleReads = 0;
  const db = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      assert.equal(table, "staff_users");
      roleReads++;
      return { select(column) {
        assert.equal(column, "role");
        return { eq(column, value) {
          assert.equal(column, "id");
          assert.equal(value, user.id);
          return { maybeSingle: async () => ({ data: role ? { role } : null, error: roleError }) };
        } };
      } };
    },
  };
  const auth = loadModule(new URL("../lib/auth.ts", import.meta.url), {
    "./errors": errors, "./data/mode": { usingStub: () => false },
    "./supabase/server": { createClient: async () => db },
  });
  const endpoint = loadModule(new URL("../app/api/users/me/route.ts", import.meta.url), {
    "next/server": next, "@/lib/errors": errors, "@/lib/auth": auth,
  });
  return { ...endpoint, roleReads: () => roleReads };
}

test("anonymous caller cannot choose an owner role using the stub header in live mode", async () => {
  const endpoint = currentUser({ user: null });
  const response = await endpoint.GET(new Request("https://fsx.example/api/users/me", {
    headers: { "x-stub-role": "owner" },
  }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(endpoint.roleReads(), 0);
});

for (const role of ["staff", "owner"]) {
  test(`signed-in ${role} receives only their database role`, async () => {
    const endpoint = currentUser({ role });
    const response = await endpoint.GET(new Request("https://fsx.example/api/users/me"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { role });
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  });
}

test("signed-in user without a provisioned staff role receives 403", async () => {
  const endpoint = currentUser({ role: null });
  assert.equal((await endpoint.GET(new Request("https://fsx.example/api/users/me"))).status, 403);
});

test("role lookup failure denies access with 503 instead of granting a default role", async () => {
  const endpoint = currentUser({ roleError: { code: "database_error" } });
  assert.equal((await endpoint.GET(new Request("https://fsx.example/api/users/me"))).status, 503);
});
