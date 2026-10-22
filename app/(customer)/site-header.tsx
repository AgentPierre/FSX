"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isOpenAt } from "@/lib/hours";
import type { BusinessHour } from "@/lib/types";

/** Wordmark, open/closed pill and cart link. Also announces cart changes (screen reader and a short toast). */
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

  // A short visual toast; the same words stay in the screen-reader live region below.
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!message) return;
    setToast(true);
    const timer = setTimeout(() => setToast(false), 2400);
    return () => clearTimeout(timer);
  }, [message, count, subtotalLabel]);

  return (
    <div className="border-b-2 border-ink bg-paper">
      <nav aria-label="Ordering navigation" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/menu" className="inline-flex min-h-11 items-center rounded whitespace-nowrap font-heading text-lg font-black tracking-tight text-brand-red focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue sm:text-2xl">
          Menciu&apos;s Chopstix
        </Link>
        <div className="flex items-center gap-3">
          {open !== null && (
            <span className={`hidden items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold sm:inline-flex ${open ? "bg-open text-open-ink" : "bg-tile text-ink"}`}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${open ? "bg-status-ready" : "bg-muted"}`} />
              {open ? "Open now" : "Closed now"}
            </span>
          )}
          <Link href="/cart" className="sticker inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-blue px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
            Cart{" "}
            <span key={count} className={`whitespace-nowrap tabular-nums ${count > 0 ? "anim-bump inline-block" : ""}`}>
              {ready ? <>({count})<span className="hidden sm:inline"> · {subtotalLabel}</span></> : "(loading…)"}
            </span>
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p role="status" className="sr-only">{message && `${message} ${count} items, subtotal ${subtotalLabel}.`}</p>
        {invalidLines && <p role="alert" className="py-1 text-sm text-ink">Some cart selections are no longer available. Review your cart before placing an order.</p>}
        {storageError && <p role="alert" className="py-1 text-sm text-ink">{storageError}</p>}
      </div>
      {toast && message && (
        <p aria-hidden="true" className="sticker anim-pop pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white sm:bottom-8">
          {message.replace(/\.$/, "")} · {count} in cart
        </p>
      )}
    </div>
  );
}
