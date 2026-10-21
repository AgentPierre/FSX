"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isOpenAt } from "@/lib/hours";
import type { BusinessHour } from "@/lib/types";

/** Wordmark, open/closed pill and cart link. Also holds the cart's live status messages. */
export function SiteHeader({ businessHours, ready, count, subtotalLabel, message, invalidLines, storageError }: {
  businessHours: BusinessHour[] | null;
  ready: boolean;
  count: number;
  subtotalLabel: string;
  message: string;
  invalidLines: boolean;
  storageError: string;
}) {
  // Decided in the browser after load so the server and browser never disagree about "now".
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!businessHours) return;
    const update = () => setOpen(isOpenAt(new Date(), businessHours));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [businessHours]);

  return (
    <div className="border-b border-line bg-paper">
      <nav aria-label="Ordering navigation" className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/menu" className="rounded font-heading text-xl font-extrabold tracking-tight text-brand-red focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
          Menciu&apos;s Chopstix
        </Link>
        <div className="flex items-center gap-3">
          {open !== null && (
            <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline ${open ? "bg-green-100 text-green-900" : "bg-stone-200 text-stone-800"}`}>
              {open ? "Open now" : "Closed now"}
            </span>
          )}
          <Link href="/cart" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-blue px-4 font-semibold text-white hover:bg-brand-blue/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
            Cart{" "}
            <span className="tabular-nums">{ready ? `(${count}) · ${subtotalLabel}` : "(loading…)"}</span>
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p role="status" className="text-sm text-ink">{message && `${message} ${count} items, subtotal ${subtotalLabel}.`}</p>
        {invalidLines && <p role="alert" className="py-1 text-sm text-ink">Some cart selections are no longer available. Review your cart before placing an order.</p>}
        {storageError && <p role="alert" className="py-1 text-sm text-ink">{storageError}</p>}
      </div>
    </div>
  );
}
