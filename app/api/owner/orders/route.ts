import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { listOwnerOrders } from "@/lib/owner-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner order history: paid orders, newest first, with filters and pagination (T34). */
export async function GET(request: Request) {
  let response;
  try {
    const raw: Record<string, string | string[]> = Object.create(null);
    new URL(request.url).searchParams.forEach((value, key) => {
      raw[key] = key in raw ? [value, ...[raw[key]].flat()] : value;
    });
    response = NextResponse.json(await listOwnerOrders(request, raw));
  } catch (err) {
    response = errorResponse(err);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
