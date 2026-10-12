import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { allowedNext, isTicketStatus } from "@/lib/ticket";
import { parseBody, ticketPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireRole(request, ["staff", "owner"]);
    const { id } = await params;
    const { status } = await parseBody(request, ticketPatchSchema);
    if (!isTicketStatus(status)) {
      throw new ApiError(400, "invalid_request", "Unknown ticket status.");
    }

    const order = await store.getOrder(id);
    if (!order) throw new ApiError(404, "not_found", "Order not found.");
    if (order.paymentStatus !== "paid" || order.ticketStatus === null) {
      throw new ApiError(409, "not_paid", "This order has not been paid.");
    }

    const allowed = allowedNext(order.ticketStatus);
    if (allowed !== status) {
      throw new ApiError(
        409,
        "invalid_transition",
        "Tickets move one step at a time.",
        { from: order.ticketStatus, to: status, allowed },
      );
    }

    const updated = await store.setTicketStatus(order.id, status);
    return NextResponse.json({
      orderId: updated.id,
      ticketStatus: updated.ticketStatus,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
