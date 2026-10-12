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

    try {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const session = await getStripe().checkout.sessions.create(
        {
          mode: "payment",
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
        { status: 201 },
      );
    } catch (err) {
      console.error(err);
      await store.cancelOrder(order.id);
      throw new ApiError(
        502,
        "stripe_error",
        "Could not start checkout. Please try again.",
      );
    }
  } catch (err) {
    return errorResponse(err);
  }
}
