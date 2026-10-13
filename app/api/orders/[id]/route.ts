import { NextResponse } from "next/server";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { toPublicOrder } from "@/lib/public-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Order status for the confirmation page. Access is by link: the random order id is the credential
 * (see docs/api.md). The response holds no email, phone, payment or Stripe details.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await store.getOrder(id);
    if (!order) throw new ApiError(404, "not_found", "Order not found.");
    return NextResponse.json(toPublicOrder(order), {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
