import { NextResponse } from "next/server";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { createPendingOrder } from "@/lib/orders";
import { getStripe, siteTag, stripeConfigured } from "@/lib/stripe";
import { createOrderSchema, parseBody } from "@/lib/validation";
import type { OrderLine } from "@/lib/types";

export const runtime = "nodejs";

function lineLabel(l: OrderLine) {
  const parts = [l.nameSnapshot];
  if (l.sizeName !== "regular") parts.push(`(${l.sizeName})`);
  if (l.components.length) parts.push(`– ${l.components.join(" + ")}`);
  if (l.spicy) parts.push("– spicy");
  return parts.join(" ");
}

/** Keep useful SDK diagnostics, never messages, raw responses or arbitrary nested fields. */
function errorMetadata(error: unknown) {
  const metadata: { type?: string; code?: string; statusCode?: number } = {};
  if (typeof error !== "object" || error === null) return metadata;
  const source = error as Record<string, unknown>;
  for (const field of ["type", "code"] as const) {
    const value = source[field];
    if (typeof value === "string" && /^[A-Za-z0-9_]{1,80}$/.test(value)) metadata[field] = value;
  }
  const status = source.statusCode;
  if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
    metadata.statusCode = status;
  }
  return metadata;
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, createOrderSchema);

    if (!stripeConfigured()) {
      throw new ApiError(
        503,
        "stripe_not_configured",
        "Payments are not configured (STRIPE_SECRET_KEY and STRIPE_SITE_TAG are required).",
      );
    }

    const { order, earliestPickup } = await createPendingOrder(body);

    let stripeSessionId: string | undefined;
    try {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const session = await getStripe().checkout.sessions.create(
        {
          mode: "payment",
          // Abandoned checkouts end after 31 minutes. Stripe's minimum is 30 minutes from when it
          // receives the request, so exactly 30 can be rejected; the extra minute is the buffer.
          // The webhook then marks the order `expired` so it never lingers as pending.
          expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
          client_reference_id: order.id,
          customer_email: order.customerEmail,
          metadata: { order_id: order.id, site: siteTag() ?? "" },
          line_items: [
            ...order.lines.map((l) => ({
              quantity: l.quantity,
              price_data: {
                currency: "usd",
                unit_amount: l.unitPriceCents,
                product_data: { name: lineLabel(l) },
              },
            })),
            ...(order.taxCents > 0
              ? [
                  {
                    quantity: 1,
                    price_data: {
                      currency: "usd",
                      unit_amount: order.taxCents,
                      product_data: {
                        name: `Sales tax (${order.taxRateBps / 100}%)`,
                      },
                    },
                  },
                ]
              : []),
          ],
          success_url: `${site}/order/${order.id}`,
          cancel_url: `${site}/cart`,
        },
        { idempotencyKey: `order-${order.id}` },
      );
      stripeSessionId = session.id;
      if (!session.url) throw new Error("Stripe returned no checkout URL.");
      await store.setStripeSession(order.id, session.id);

      return NextResponse.json(
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          checkoutUrl: session.url,
          totalCents: order.totalCents,
          earliestPickup: earliestPickup.toISOString(),
        },
        { status: 201, headers: { Location: `/api/orders/${order.id}`, "Cache-Control": "no-store" } },
      );
    } catch (err) {
      // SDK/database errors may include customer data or request bodies. Log context, not the object.
      console.error("Checkout could not be started", {
        orderId: order.id,
        stage: stripeSessionId ? "session_attachment" : "session_creation",
        ...errorMetadata(err),
      });
      if (stripeSessionId) {
        try {
          // A failed database attachment must not leave an open, payable checkout behind.
          await getStripe().checkout.sessions.expire(stripeSessionId);
        } catch (err) {
          // Still expire the pending order if Stripe cleanup fails; flag it for follow-up.
          console.error("Stripe checkout cleanup failed; check for an unattached payable session.", {
            orderId: order.id, stage: "session_cleanup", ...errorMetadata(err),
          });
        }
      }
      try {
        await store.expireOrder(order.id);
      } catch (err) {
        console.error("Pending order cleanup failed; reconcile this order.", {
          orderId: order.id, stage: "order_cleanup", ...errorMetadata(err),
        });
      }
      throw new ApiError(
        502,
        "stripe_error",
        "Could not start checkout. Please try again.",
      );
    }
  } catch (err) {
    const response = errorResponse(err);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
