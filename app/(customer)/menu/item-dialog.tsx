"use client";

import { useEffect, useId, useRef } from "react";
import type { MenuItem } from "@/lib/types";
import { MenuThumb } from "@/components/menu-thumb";
import { allergenNotice } from "@/lib/allergens";
import { useCart } from "../cart-provider";
import { ItemCustomization } from "../item-customization";
import { useBackdropClose } from "./use-backdrop-close";

/** Add-to-cart sheet. Uses the browser's own <dialog>, which traps focus, closes on Esc and restores focus. */
export function ItemDialog({ item, tone, onClose }: { item: MenuItem; tone: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { add, settings } = useCart();
  const backdrop = useBackdropClose(ref);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      {...backdrop}
      className="sheet m-auto w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[2rem] border-2 border-ink bg-cream p-0 text-ink shadow-[0_-6px_0_0_var(--color-ink)] max-sm:mb-0 max-sm:max-h-[92dvh] max-sm:max-w-none sm:max-h-[88dvh] sm:rounded-[2rem] sm:shadow-[8px_8px_0_0_var(--color-ink)]"
    >
      <div className="relative">
        <MenuThumb code={item.code} tone={tone} size="sheet" className="h-36 w-full border-b-2 border-ink sm:h-44" />
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="sticker absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper text-2xl font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">×</button>
      </div>
      <div className="px-5 pb-0 pt-4">
        <p className="font-mono text-xs text-muted"><span className="sr-only">Item code </span>{item.code}</p>
        <h2 id={titleId} className="mt-1 text-3xl font-black leading-tight text-brand-blue">{item.name}</h2>
        {item.description && <p className="mt-2 text-muted">{item.description}</p>}
        {allergenNotice(item.description) && (
          <p className="mt-3 rounded-xl border-2 border-ink bg-mustard px-3 py-2 font-bold text-ink">
            <span className="sr-only">Allergen warning: </span>{allergenNotice(item.description)}
          </p>
        )}
        {item.isCatering && <p className="mt-2 text-sm font-semibold">{settings ? `Allow at least ${settings.leadCateringMinutes} minutes for pickup.` : "Pickup lead time is currently unavailable."}</p>}
        <div className="mt-5">
          <ItemCustomization item={item} onSave={add} inSheet onAdded={() => ref.current?.close()} />
        </div>
      </div>
    </dialog>
  );
}
