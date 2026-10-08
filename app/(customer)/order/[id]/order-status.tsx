"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";
import type { PublicOrder } from "@/lib/public-order";

const PENDING_MS = 3_000; // waiting for the Stripe webhook
const ACTIVE_MS = 10_000; // paid, ticket still moving

const TICKET_COPY = {
  received: "We have your order.",
  in_progress: "The kitchen is making your order.",
  ready: "Your order is ready for pickup.",
  completed: "Picked up. Thank you!",
} as const;

function isFinal(o: PublicOrder) {
  return (
    o.paymentStatus === "cancelled" ||
    o.paymentStatus === "refunded" ||
    o.ticketStatus === "completed"
  );
}

export function OrderStatus({ initial }: { initial: PublicOrder }) {
  const [order, setOrder] = useState(initial);
  const [lost, setLost] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isFinal(order)) return;
    const delay = order.paymentStatus === "paid" ? ACTIVE_MS : PENDING_MS;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`, {
          cache: "no-store",
        });
        if (res.ok) {
          setOrder(await res.json());
          setLost(false);
        } else {
          setLost(true);
        }
      } catch {
        setLost(true);
      }
      setTick((t) => t + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [order, tick]);

  const pickup = new Date(order.pickupTime).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  let headline: string;
  let detail: string;
  if (order.paymentStatus === "pending_payment") {
    headline = "Confirming your payment…";
    detail =
      "This usually takes a few seconds. Keep this page open. If you left checkout without paying, your order will not be sent to the kitchen.";
  } else if (order.paymentStatus === "cancelled") {
    headline = "This order was not completed.";
    detail = "You have not been charged for it. You can start a new order.";
  } else if (order.paymentStatus === "refunded") {
    headline = "This order was refunded.";
    detail = "Contact the restaurant if you have questions.";
  } else {
    headline = `Order #${order.orderNumber}`;
    detail = TICKET_COPY[order.ticketStatus ?? "received"];
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold" aria-live="polite">
        {headline}
      </h1>
      <p className="mt-2">{detail}</p>
      {lost && (
        <p className="mt-2 text-sm opacity-70">
          Having trouble reaching the server. Still trying…
        </p>
      )}

      <dl className="mt-6 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Pickup</dt>
          <dd className="tabular-nums">{pickup} (Houston time)</dd>
        </div>
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Tax</dt>
          <dd className="tabular-nums">{formatCents(order.taxCents)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(order.totalCents)}</dd>
        </div>
      </dl>

      <ul className="mt-6 space-y-1 text-sm">
        {order.lines.map((l, i) => (
          <li key={i}>
            {l.quantity} × {l.name}
            {l.sizeName !== "regular" && ` (${l.sizeName})`}
            {l.components.length > 0 && ` – ${l.components.join(" + ")}`}
            {l.spicy && " – spicy"}
          </li>
        ))}
      </ul>
    </div>
  );
}
