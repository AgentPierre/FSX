import { ApiError } from "./errors";
import type { Role } from "./types";
import { usingStub } from "./data/mode";
import { createClient } from "./supabase/server";

export async function requireRole(request: Request, allowed: Role[]): Promise<Role> {
  if (usingStub()) {
    const role = request.headers.get("x-stub-role");
    if (!role) throw new ApiError(401, "unauthenticated", "Sign in required.");
    if (!allowed.includes(role as Role)) throw new ApiError(403, "forbidden", "Not allowed for this role.");
    return role as Role;
  }
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new ApiError(401, "unauthenticated", "Sign in required.");
  const { data, error } = await db.from("staff_users").select("role").eq("id",user.id).maybeSingle();
  if (error) throw new ApiError(503, "auth_unavailable", "Could not verify the account role.");
  if (!data || !allowed.includes(data.role as Role)) throw new ApiError(403,"forbidden","Not allowed for this role.");
  return data.role as Role;
}
