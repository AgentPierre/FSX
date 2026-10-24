"use client";

import { useEffect, useState } from "react";
import { isOpenAt } from "@/lib/hours";
import { pill } from "@/lib/ui";
import type { BusinessHour } from "@/lib/types";

/**
 * Whether the restaurant is open right now (Central time), rechecked every minute.
 * Decided in the browser after load so the server and browser never disagree about "now".
 * Null until known, or when hours could not be loaded.
 */
export function useOpenNow(businessHours: BusinessHour[] | null): boolean | null {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!businessHours) return;
    const update = () => setOpen(isOpenAt(new Date(), businessHours));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [businessHours]);
  return open;
}

/** "Open now" / "Closed now" pill. Colour is never the only signal: the words say it. */
export function OpenPill({ open, className = "" }: { open: boolean | null; className?: string }) {
  if (open === null) return null;
  return (
    <span className={`${pill} inline-flex items-center gap-1.5 ${open ? "bg-open text-open-ink" : "bg-tile text-ink"} ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${open ? "bg-status-ready" : "bg-muted"}`} />
      {open ? "Open now" : "Closed now"}
    </span>
  );
}
