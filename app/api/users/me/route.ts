import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current team account's verified role; never a user directory or a role assignment API. */
export async function GET(request: Request) {
  let response;
  try {
    const role = await requireRole(request, ["staff", "owner"]);
    response = NextResponse.json({ role });
  } catch (err) {
    response = errorResponse(err);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
