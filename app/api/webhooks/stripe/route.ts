import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { getStripe, siteTag, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

// Both mean "the money arrived". Cards, Apple Pay and Google Pay arrive in the first;
// delayed methods (e.g. bank debits) arrive in the second.
const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !stripeConfigured()) {
      throw new ApiError(
        503,
        "stripe_not_configured",
        "Webhook is not configured (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_SITE_TAG are required).",
      );
    }

    // Signature verification needs the raw, unparsed body.
    const raw = await request.text();
    const signature = request.headers.get("stripe-signature");
    let event: Stripe.Event;
    try {
      if (!signature) throw new Error("missing signature");
      event = getStripe().webhooks.constructEvent(raw, signature, secret);
    } catch {
      throw new ApiError(400, "invalid_signature", "Invalid signature.");
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.error("Delayed payment failed; order stays pending", {
        orderId: session.client_reference_id,
      });
    }

    if (PAID_EVENTS.has(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;

      // The test Stripe account is shared by every teammate's local server and the deployed app.
      // Ignore sessions another environment created, or they would retry here for days.
      if (session.metadata?.site !== siteTag()) {
        return NextResponse.json({ received: true, ignored: "other_site" });
      }

      const orderId = session.client_reference_id;
      const order = orderId ? await store.getOrder(orderId) : null;
      if (!order) {
        // Not a 200: Stripe retries for up to 3 days, so a temporary lookup failure
        // never loses a payment.
        throw new ApiError(
          500,
          "order_not_found",
          "Order not found; retry later.",
        );
      }

      if (session.payment_status !== "paid") {
        // Delayed method still processing; async_payment_succeeded will follow.
      } else if (session.amount_total !== order.totalCents) {
        console.error("Webhook amount mismatch; not marking paid", {
          orderId,
          expected: order.totalCents,
          got: session.amount_total,
        });
      } else {
        const result = await store.markPaid(order.id, session.id);
        if (result === "not_pending") {
          console.error("Payment received for a cancelled/refunded order", {
            orderId,
            paymentStatus: order.paymentStatus,
          });
        } else if (result === "session_mismatch") {
          console.error("Webhook session does not match the order", {
            orderId,
            sessionId: session.id,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return errorResponse(err);
  }
}
