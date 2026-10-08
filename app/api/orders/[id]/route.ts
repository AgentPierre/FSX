import { NextResponse } from "next/server";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { toPublicOrder } from "@/lib/public-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public order status for the confirmation page. The order id is an unguessable UUID. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await store.getOrder(id);
    if (!order) throw new ApiError(404, "not_found", "Order not found.");
    return NextResponse.json(toPublicOrder(order), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
