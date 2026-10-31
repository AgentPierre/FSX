import { NextResponse } from "next/server";
import { listMyOrders } from "@/lib/account-orders";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in customer's own paid orders, newest first (SCRUM-65, customer accounts). */
export async function GET(request: Request) {
  let response;
  try {
    response = NextResponse.json(await listMyOrders(request));
  } catch (err) {
    response = errorResponse(err);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
