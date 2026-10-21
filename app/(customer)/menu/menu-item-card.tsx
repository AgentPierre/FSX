"use client";

import { useId, useState } from "react";
import { formatCents } from "@/lib/money";
import { useCart } from "../cart-provider";
import { ItemCustomization } from "../item-customization";
import type { MenuItem } from "@/lib/types";
import { sizeLabel } from "@/lib/menu-display";
import { MenuThumb } from "@/components/menu-thumb";
import { btnPrimary, btnSecondary } from "@/lib/ui";

/** One menu row: photo, code, name, description, price, and an Add button that opens the options. */
export function MenuItemCard({ item }: { item: MenuItem }) {
  const { add, settings } = useCart();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const sizes = item.sizes;
  const canOrder = item.isAvailable && item.isActive;
  return (
    <article aria-labelledby={`item-${item.id}`} className="py-4">
      <div className="flex items-start gap-4">
        <MenuThumb code={item.code} />
        <div className="min-w-0 flex-1">
          <h3 id={`item-${item.id}`} className="text-base font-bold leading-snug sm:text-lg">
            <span className="mr-2 inline-block rounded bg-tile px-1.5 py-0.5 align-middle font-mono text-xs font-normal text-muted">
              <span className="sr-only">Item code </span>{item.code}
            </span>
            {item.name}
          </h3>
          {item.isSpicyFlag && <p className="mt-1 text-sm font-semibold text-brand-red"><span aria-hidden="true">★ </span>Spicy</p>}
          {!canOrder && <p className="mt-1 text-sm font-semibold text-muted">Sold out — currently unavailable</p>}
          {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>}
          {item.code === "G1" && <p className="mt-1 text-sm text-muted">Choose exactly two half orders from G2–G10. You may choose the same dish twice.</p>}
          {item.isCatering && <p className="mt-1 text-sm text-muted">{settings ? `Allow at least ${settings.leadCateringMinutes} minutes for pickup.` : "Pickup lead time is currently unavailable."}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <dl aria-label={`Prices for ${item.name}`} className="space-y-0.5 text-right">
            {sizes.map((size) => (
              <div key={size.id} className="flex items-baseline justify-end gap-2">
                {size.name !== "regular" && <dt className="text-xs text-muted">{sizeLabel(size.name)}</dt>}
                <dd className="font-bold tabular-nums text-brand-red">{formatCents(size.priceCents)}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className={`${open ? btnSecondary : btnPrimary} min-w-20`}
            aria-expanded={open}
            aria-controls={panelId}
            disabled={!canOrder}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Add"}
            <span className="sr-only"> {item.name}</span>
          </button>
        </div>
      </div>
      {open && (
        <div id={panelId} className="mt-3 rounded-xl border border-line bg-paper p-4">
          <ItemCustomization item={item} onSave={add} focusOnMount />
        </div>
      )}
    </article>
  );
}
