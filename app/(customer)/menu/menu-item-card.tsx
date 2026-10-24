"use client";

import { useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/money";
import { MAX_LINES, MAX_QUANTITY } from "@/lib/cart";
import { linesForItem, quantityOf } from "@/lib/cart-counts";
import type { MenuItem } from "@/lib/types";
import { MenuThumb } from "@/components/menu-thumb";
import { useCart } from "../cart-provider";
import { ConfirmRemove } from "./confirm-remove";
import { ItemDialog } from "./item-dialog";

const stepButton =
  "relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-30";

/**
 * One menu tile. Plus adds one straight away (no pop-up); once the item is in the cart a minus and the
 * count appear. Items that need a choice (sizes, the Combination Plate) open the options sheet on the
 * first plus. Tapping the name or the tile opens the sheet for size, spicy, or a note.
 */
export function MenuItemCard({ item, tone, index }: { item: MenuItem; tone: number; index: number }) {
  const { lines, ready, add, edit, remove } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const plusRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLButtonElement>(null);
  const refocusAfterRemove = useRef(false);

  const itemLines = linesForItem(lines, item);
  const last = itemLines[itemLines.length - 1];
  const quantity = quantityOf(itemLines);
  const canOrder = item.isAvailable && item.isActive;
  const needsChoice = item.code === "G1" || item.sizes.length > 1;
  const cartFull = !last && lines.length >= MAX_LINES;
  const lowest = Math.min(...item.sizes.map((size) => size.priceCents));

  // The confirmation dialog closes and the minus button may disappear. After every confirmed removal (also
  // when other options of this item stay in the cart) put keyboard focus back on this tile: the plus button,
  // or the name button if plus is disabled (closed, at the maximum, ...).
  useEffect(() => {
    if (!refocusAfterRemove.current) return;
    refocusAfterRemove.current = false;
    const plus = plusRef.current;
    (plus && !plus.disabled ? plus : nameRef.current)?.focus();
  }, [lines]);

  function plus() {
    if (last) {
      if (last.quantity < MAX_QUANTITY) edit(last.id, { ...last, quantity: last.quantity + 1 });
      return;
    }
    if (needsChoice) { setSheetOpen(true); return; }
    add({ sizeId: item.sizes[0].id, quantity: 1, spicy: false, instructions: "", components: [] });
  }
  function minus() {
    if (!last) return;
    if (last.quantity > 1) edit(last.id, { ...last, quantity: last.quantity - 1 });
    else setConfirming(true);
  }

  return (
    <article
      aria-labelledby={`item-${item.id}`}
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
      className={`anim-rise sticker sticker-hover relative flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-paper ${canOrder ? "" : "opacity-70"}`}
    >
      <div className="relative">
        <MenuThumb code={item.code} tone={tone} className="aspect-[4/3] w-full border-b-2 border-ink" />
        {quantity > 0 && (
          <span key={quantity} aria-hidden="true" className="anim-pop absolute right-2 top-2 flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-ink bg-brand-red-dark px-1 text-lg font-black tabular-nums text-white">
            {quantity}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-tile px-1.5 py-0.5 font-mono text-xs text-muted"><span className="sr-only">Item code </span>{item.code}</span>
          {item.isSpicyFlag && <span className="rounded-md bg-brand-red px-1.5 py-0.5 text-xs font-bold text-white"><span aria-hidden="true">★ </span>Spicy</span>}
          {item.isCatering && <span className="rounded-md bg-mustard px-1.5 py-0.5 text-xs font-bold text-ink">Catering</span>}
        </div>
        <h3 id={`item-${item.id}`} className="mt-2 text-base font-extrabold leading-snug sm:text-lg">
          <button
            ref={nameRef}
            type="button"
            disabled={!canOrder}
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-default"
          >
            {item.name}<span className="sr-only">, choose options</span>
          </button>
        </h3>
        {!canOrder && <p className="mt-1 text-sm font-bold text-muted">Sold out</p>}
        {item.description && <p className="mt-1 line-clamp-2 text-xs text-muted sm:text-sm">{item.description}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-3">
          <p className="mr-auto text-lg font-bold tabular-nums leading-tight text-brand-red sm:text-2xl">
            {item.sizes.length > 1 && <span className="block text-xs font-medium text-muted">from</span>}
            {formatCents(lowest)}
          </p>
          <div className="flex items-center rounded-full border-2 border-ink bg-paper" role="group" aria-label={`${item.name} quantity`}>
            {quantity > 0 && (
              <>
                <button type="button" onClick={minus} aria-label={`Remove one ${item.name}`} className={`${stepButton} enabled:hover:bg-tile`}>
                  <span aria-hidden="true">−</span>
                </button>
                <output className="relative z-10 min-w-7 text-center text-lg font-bold tabular-nums">{quantity}</output>
              </>
            )}
            <button
              ref={plusRef}
              type="button"
              disabled={!canOrder || !ready || cartFull || (last ? last.quantity >= MAX_QUANTITY : false)}
              onClick={plus}
              aria-label={`Add one ${item.name}`}
              className={`${stepButton} bg-brand-red text-white enabled:hover:bg-brand-red-dark`}
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      </div>
      {sheetOpen && <ItemDialog item={item} tone={tone} onClose={() => setSheetOpen(false)} />}
      {confirming && last && (
        <ConfirmRemove
          name={item.name}
          onKeep={() => setConfirming(false)}
          onRemove={() => { refocusAfterRemove.current = true; remove(last.id); setConfirming(false); }}
        />
      )}
    </article>
  );
}
