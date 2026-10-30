import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": require("next/server") });

/** requireRole against a fake Supabase session whose staff_users lookup returns `row`. */
function requireRoleFor(row, user = { id: "user-1" }) {
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
  };
  const { requireRole } = loadModule(new URL("../lib/auth.ts", import.meta.url), {
    "./errors": errors,
    "./data/mode": { usingStub: () => false },
    "./supabase/server": { createClient: async () => client },
  });
  return requireRole({ headers: new Headers() }, ["staff", "owner"]);
}

test("an active staff or owner account gets its role", async () => {
  assert.equal(await requireRoleFor({ role: "staff", active: true }), "staff");
  assert.equal(await requireRoleFor({ role: "owner", active: true }), "owner");
});

test("a deactivated account is refused even though its row still exists", async () => {
  await assert.rejects(requireRoleFor({ role: "owner", active: false }), (error) => error.status === 403 && error.code === "forbidden");
});

test("an account with no staff row is refused", async () => {
  await assert.rejects(requireRoleFor(null), (error) => error.status === 403);
});

test("no session means 401, not 403", async () => {
  await assert.rejects(requireRoleFor({ role: "staff", active: true }, null), (error) => error.status === 401);
});
