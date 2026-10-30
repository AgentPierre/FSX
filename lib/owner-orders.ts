import { z } from "zod";
import { requireRole, type AuthRequest } from "./auth";
import { store } from "./data";
import { ApiError } from "./errors";
import { ownerHistoryQuerySchema, ownerOrderQuerySchema } from "./owner-order-query";
import { toOwnerOrder } from "./views";

// These guards must stay next to the reads: the store uses a privileged server client.
export async function listOwnerOrders(request: AuthRequest, raw: unknown, calendarDates = false) {
  await requireRole(request, ["owner"]);
  const parsed = (calendarDates ? ownerHistoryQuerySchema : ownerOrderQuerySchema).safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Check the search, dates, status, and page number.", {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  const { status, ...query } = parsed.data;
  const result = await store.listOrders({ ...query, ticketStatus: status });
  return { orders: result.orders.map(toOwnerOrder), total: result.total, page: query.page, pageSize: query.pageSize };
}

export async function getOwnerOrder(request: AuthRequest, id: string) {
  await requireRole(request, ["owner"]);
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "not_found", "Order not found.");
  const order = await store.getOrder(id);
  if (!order || order.paymentStatus !== "paid") throw new ApiError(404, "not_found", "Order not found.");
  return toOwnerOrder(order);
}
