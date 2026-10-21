"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";
import { MenuThumb } from "@/components/menu-thumb";
import { ItemDialog } from "./item-dialog";

/** One menu tile. The round plus button (stretched over the whole tile) opens the add-to-cart sheet. */
export function MenuItemCard({ item, tone, index }: { item: MenuItem; tone: number; index: number }) {
  const [open, setOpen] = useState(false);
  const canOrder = item.isAvailable && item.isActive;
  const prices = item.sizes.map((size) => size.priceCents);
  const lowest = Math.min(...prices);
  const multiSize = item.sizes.length > 1;
  return (
    <article
      aria-labelledby={`item-${item.id}`}
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
      className={`anim-rise sticker sticker-hover relative flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-paper ${canOrder ? "" : "opacity-70"}`}
    >
      <MenuThumb code={item.code} tone={tone} className="aspect-[4/3] w-full border-b-2 border-ink" />
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-tile px-1.5 py-0.5 font-mono text-xs text-muted"><span className="sr-only">Item code </span>{item.code}</span>
          {item.isSpicyFlag && <span className="rounded-md bg-brand-red px-1.5 py-0.5 text-xs font-bold text-white"><span aria-hidden="true">★ </span>Spicy</span>}
          {item.isCatering && <span className="rounded-md bg-mustard px-1.5 py-0.5 text-xs font-bold text-ink">Catering</span>}
        </div>
        <h3 id={`item-${item.id}`} className="mt-2 text-base font-extrabold leading-snug sm:text-lg">{item.name}</h3>
        {!canOrder && <p className="mt-1 text-sm font-bold text-muted">Sold out</p>}
        {item.description && <p className="mt-1 line-clamp-2 text-xs text-muted sm:text-sm">{item.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="font-bold tabular-nums text-brand-red sm:text-lg">
            {multiSize && <span className="block text-xs font-medium text-muted">from</span>}
            {formatCents(lowest)}
          </p>
          <button
            type="button"
            disabled={!canOrder}
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand-red text-3xl font-bold leading-none text-white after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue disabled:opacity-40"
          >
            <span aria-hidden="true">+</span>
            <span className="sr-only">Add {item.name}</span>
          </button>
        </div>
      </div>
      {open && <ItemDialog item={item} tone={tone} onClose={() => setOpen(false)} />}
    </article>
  );
}
