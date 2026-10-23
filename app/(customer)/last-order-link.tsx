"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readLastOrder, type LastOrder } from "@/lib/last-order";
import { pill } from "@/lib/ui";

/** "Your order #0042" shortcut back to the order page, shown only on a device that has a recent order. */
export function LastOrderLink({ className = "" }: { className?: string }) {
  // Read after load: storage doesn't exist on the server, and the server and browser must render the same.
  const [order, setOrder] = useState<LastOrder | null>(null);
  useEffect(() => { setOrder(readLastOrder()); }, []);
  if (!order) return null;
  return (
    <Link
      href={`/order/${order.id}`}
      className={`${pill} items-center bg-paper text-sm text-brand-blue underline decoration-2 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue min-h-11 ${className || "inline-flex"}`}
    >
      Your order #{order.orderNumber}
    </Link>
  );
}
