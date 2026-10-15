import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { store } from "@/lib/data";
import { errorResponse } from "@/lib/errors";
import { toKitchenTicket } from "@/lib/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kitchen and counter board: paid tickets still in play, oldest first. Staff and owner. */
export async function GET(request: Request) {
  try {
    requireRole(request, ["staff", "owner"]);
    const orders = await store.listKitchenOrders();
    return NextResponse.json(
      { tickets: orders.map(toKitchenTicket) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
