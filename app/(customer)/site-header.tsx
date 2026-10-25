"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { businessHoursLabel } from "@/lib/menu-display";
import { LastOrderLink } from "./last-order-link";
import { OpenPill } from "./open-status";
import type { BusinessHour } from "@/lib/types";

/** Wordmark, open/closed pill and cart link. Also announces cart changes (screen reader and a short toast). */
export function SiteHeader({ businessHours, ordersOpen, ready, count, subtotalLabel, message, actionKey, noticeSeq, invalidLines, storageError }: {
  businessHours: BusinessHour[] | null;
  ordersOpen: boolean | null;
  ready: boolean;
  count: number;
  subtotalLabel: string;
  message: string;
  /** Changes on every cart action (the lines array), so the toast shows once per action. */
  actionKey: unknown;
  /** Increases each time a change is refused (e.g. closed), which shows the toast even though no line changed. */
  noticeSeq: number;
  invalidLines: boolean;
  storageError: string;
}) {
  // A short visual toast; the same words stay in the screen-reader live region below.
  const [toast, setToast] = useState<string | null>(null);
  const lastNoticeSeq = useRef(noticeSeq);
  useEffect(() => {
    if (!message) return;
    // A refused change (closed) shows its own words; a cart change shows "<message> · N in cart".
    const refused = noticeSeq !== lastNoticeSeq.current;
    lastNoticeSeq.current = noticeSeq;
    setToast(refused ? message : `${message.replace(/\.$/, "")} · ${count} in cart`);
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- show once per cart action or refusal, not when the message text is re-read
  }, [actionKey, noticeSeq]);

  return (
    <div className="border-b-2 border-ink bg-paper">
      <nav aria-label="Ordering navigation" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/menu" className="inline-flex min-h-11 items-center gap-2 rounded whitespace-nowrap font-heading text-base font-black tracking-tight text-brand-red min-[360px]:text-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue sm:text-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo from /public */}
          <img src="/brand/chopstix-mark.webp" alt="" width={36} height={36} className="h-9 w-9 rounded-full max-[359px]:hidden" />
          Menciu&apos;s Chopstix
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-3 sm:flex">
            <LastOrderLink className="text-xs" />
            <OpenPill open={ordersOpen} className="text-xs" />
          </span>
          <Link
            href="/cart"
            aria-label={ready ? `Cart, ${count} ${count === 1 ? "item" : "items"}, subtotal ${subtotalLabel}` : "Cart"}
            className="sticker inline-flex min-h-11 items-center gap-3 rounded-full bg-brand-blue px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
          >
            <span className="relative inline-flex" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 3.5h2.6l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2l1.4-6.6H6" />
                <circle cx="9.5" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
              {ready && (
                <span key={count} className={`absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-paper bg-brand-red px-1 text-xs font-black tabular-nums text-white ${count > 0 ? "anim-bump" : ""}`}>
                  {count}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap tabular-nums" aria-hidden="true">{ready ? (subtotalLabel.startsWith("$") ? subtotalLabel : "—") : "…"}</span>
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 pb-2 sm:hidden"><OpenPill open={ordersOpen} className="text-xs" /><LastOrderLink className="text-xs" /></div>
        <p role="status" className="sr-only">{message && `${message} ${count} items, subtotal ${subtotalLabel}.`}</p>
        {invalidLines && <p role="alert" className="py-1 text-sm text-ink">Some cart selections are no longer available. Review your cart before placing an order.</p>}
        {storageError && <p role="alert" className="py-1 text-sm text-ink">{storageError}</p>}
      </div>
      {ordersOpen === false && (
        <p role="status" className="border-t-2 border-ink bg-mustard px-4 py-2 text-center text-sm font-bold text-ink">
          We&apos;re closed right now, so ordering is off. You can still browse the menu.
          {businessHours && <span className="block font-medium">{businessHoursLabel(businessHours)}</span>}
        </p>
      )}
      {toast && (
        <p aria-hidden="true" className="sticker anim-pop pointer-events-none fixed bottom-24 left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white sm:bottom-8">
          {toast}
        </p>
      )}
    </div>
  );
}
