import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { isTicketStatus } from "@/lib/ticket";
import type { TicketStatus } from "@/lib/types";
import { toOwnerOrder } from "@/lib/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  // Accept any offset, then normalise to UTC so every store compares the same instant.
  from: z.iso
    .datetime({ offset: true })
    .transform((v) => new Date(v).toISOString())
    .optional(),
  to: z.iso
    .datetime({ offset: true })
    .transform((v) => new Date(v).toISOString())
    .optional(),
  status: z.string().refine(isTicketStatus).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Owner order history: paid orders, newest first, with filters and pagination (T34). */
export async function GET(request: Request) {
  try {
    await requireRole(request, ["owner"]);
    const raw = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_request", "Invalid filters.", {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    const { status, ...rest } = parsed.data;
    const { orders, total } = await store.listOrders({
      ...rest,
      ticketStatus: status as TicketStatus | undefined,
    });
    return NextResponse.json(
      {
        orders: orders.map(toOwnerOrder),
        total,
        page: rest.page,
        pageSize: rest.pageSize,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
