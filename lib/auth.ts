import { ApiError } from "./errors";
import type { Role } from "./types";
import { usingStub } from "./data/mode";
import { createClient } from "./supabase/server";

export type AuthRequest = { headers: Pick<Headers, "get"> };

export async function requireRole(request: AuthRequest, allowed: Role[]): Promise<Role> {
  if (usingStub()) {
    const role = request.headers.get("x-stub-role");
    if (!role) throw new ApiError(401, "unauthenticated", "Sign in required.");
    if (!allowed.includes(role as Role)) throw new ApiError(403, "forbidden", "Not allowed for this role.");
    return role as Role;
  }
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new ApiError(401, "unauthenticated", "Sign in required.");
  const { data, error } = await db.from("staff_users").select("role,active").eq("id",user.id).maybeSingle();
  if (error) throw new ApiError(503, "auth_unavailable", "Could not verify the account role.");
  // An inactive account keeps its row (so audit logs still resolve) but has no access.
  if (!data || !data.active || !allowed.includes(data.role as Role)) throw new ApiError(403,"forbidden","Not allowed for this role.");
  return data.role as Role;
}

/**
 * The id of whoever is signed in (customer, staff or owner), or null for a guest. Taken only from the verified
 * session: never accept a user id from a request body, query string or header in live mode. A Route Handler
 * can refresh an expired session itself, so this works without the middleware.
 */
export async function optionalUser(request: AuthRequest): Promise<string | null> {
  if (usingStub()) return request.headers.get("x-stub-user");
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  return error || !user ? null : user.id;
}

/** Like optionalUser, but a guest is refused with 401. */
export async function requireUser(request: AuthRequest): Promise<string> {
  const id = await optionalUser(request);
  if (!id) throw new ApiError(401, "unauthenticated", "Sign in required.");
  return id;
}
