import { ApiError } from "./errors";
import type { Role } from "./types";

/**
 * STUB. Replace with Supabase Auth + staff_users.role after the schema is approved.
 * Reads a dev-only header and is refused outright in production.
 */
export function requireRole(request: Request, allowed: Role[]): Role {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(
      503,
      "auth_not_configured",
      "Staff auth is not implemented yet.",
    );
  }
  const role = request.headers.get("x-stub-role");
  if (!role) throw new ApiError(401, "unauthenticated", "Sign in required.");
  if (!allowed.includes(role as Role)) {
    throw new ApiError(403, "forbidden", "Not allowed for this role.");
  }
  return role as Role;
}
