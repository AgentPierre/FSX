import { NextResponse } from "next/server";
import { store } from "@/lib/data";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public menu resource. Sold-out active items remain visible with isAvailable=false. */
export async function GET() {
  let response;
  try {
    response = NextResponse.json({ categories: await store.getMenu() });
  } catch (err) {
    response = errorResponse(err);
  }
  // Availability and prices can change during service; do not serve a cached menu.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
